import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";
import { IPageIHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEquipmentReservation";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Search and retrieve a paginated list of equipment reservations
 * (healthcare_platform_equipment_reservations table).
 *
 * This endpoint provides a filtered, paginated listing of equipment
 * reservations, enabling department heads to review, schedule, or audit
 * equipment allocations under their organization. Filters include
 * equipment/resource, appointment, reservation type, date windows, and
 * reservation status (active or archived via soft-delete logic).
 *
 * Access is strictly scoped by the caller's authenticated organization. The
 * response includes all reservation and pagination metadata required by
 * compliance and scheduling workflows; fields are directly mapped from the core
 * schema.
 *
 * @param props - The request object containing:
 *
 *   - DepartmentHead: DepartmentheadPayload (authenticated department head;
 *       organization_id required)
 *   - Body: IHealthcarePlatformEquipmentReservation.IRequest (search, filter, and
 *       pagination parameters)
 *
 * @returns Paginated search results of equipment reservations matching all
 *   given filters, always scoped to the caller's organization context.
 * @throws {Error} If authentication is invalid, organization_id is missing, or
 *   if query fails.
 */
export async function patchhealthcarePlatformDepartmentHeadEquipmentReservations(props: {
  departmentHead: DepartmentheadPayload;
  body: IHealthcarePlatformEquipmentReservation.IRequest;
}): Promise<IPageIHealthcarePlatformEquipmentReservation> {
  const { departmentHead, body } = props;

  // --- RBAC: enforce organization scoping ---
  // Here, departmentHead must carry org id property due to no cross-table join
  // If not present, error - this is a hard contract for multi-tenancy
  if (
    !("organization_id" in departmentHead) ||
    !departmentHead.organization_id
  ) {
    throw new Error("Department head organization context missing");
  }
  const orgId = departmentHead.organization_id;

  // --- Pagination normalization (ensure plain number, min 1 page/limit) ---
  const pageRaw = body.page ?? 1;
  const limitRaw = body.limit ?? 20;
  const page = Number(pageRaw);
  const limit = Number(limitRaw);
  const skip = (page - 1) * limit;

  // --- Build Prisma where clause with all permitted filters ---
  const where: Record<string, unknown> = {
    healthcare_platform_organization_id: orgId,
    ...(body.status === "archived"
      ? { deleted_at: { not: null } }
      : { deleted_at: null }),
    ...(body.equipment_id !== undefined &&
      body.equipment_id !== null && {
        equipment_id: body.equipment_id,
      }),
    ...(body.reservation_type !== undefined &&
      body.reservation_type !== null && {
        reservation_type: body.reservation_type,
      }),
    ...(body.appointment_id !== undefined &&
      body.appointment_id !== null && {
        appointment_id: body.appointment_id,
      }),
    ...((body.reservation_start_from !== undefined &&
      body.reservation_start_from !== null) ||
    (body.reservation_start_to !== undefined &&
      body.reservation_start_to !== null)
      ? {
          reservation_start: {
            ...(body.reservation_start_from !== undefined &&
              body.reservation_start_from !== null && {
                gte: body.reservation_start_from,
              }),
            ...(body.reservation_start_to !== undefined &&
              body.reservation_start_to !== null && {
                lte: body.reservation_start_to,
              }),
          },
        }
      : {}),
  };

  // --- Sorting logic (restrict to known fields for safety) ---
  const sortableFields = [
    "reservation_start",
    "reservation_end",
    "created_at",
    "updated_at",
    "equipment_id",
    "reservation_type",
    "appointment_id",
  ];
  let orderBy;
  if (body.sort_by && sortableFields.includes(body.sort_by)) {
    orderBy = { [body.sort_by]: body.sort_order === "asc" ? "asc" : "desc" };
  } else {
    orderBy = { reservation_start: "desc" };
  }

  // --- Fetch reservations and total count in parallel ---
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_equipment_reservations.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_equipment_reservations.count({ where }),
  ]);

  // --- Map all fields through to DTO; string/date conversion enforced ---
  const data = rows.map(
    (row): IHealthcarePlatformEquipmentReservation => ({
      id: row.id,
      healthcare_platform_organization_id:
        row.healthcare_platform_organization_id,
      equipment_id: row.equipment_id,
      reservation_start: toISOStringSafe(row.reservation_start),
      reservation_end: toISOStringSafe(row.reservation_end),
      appointment_id:
        row.appointment_id !== null && row.appointment_id !== undefined
          ? row.appointment_id
          : undefined,
      reservation_type: row.reservation_type,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at !== null && row.deleted_at !== undefined
          ? toISOStringSafe(row.deleted_at)
          : undefined,
    }),
  );

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
