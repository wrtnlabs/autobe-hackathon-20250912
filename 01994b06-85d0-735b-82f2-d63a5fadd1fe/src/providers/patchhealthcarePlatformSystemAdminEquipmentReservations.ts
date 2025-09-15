import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";
import { IPageIHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEquipmentReservation";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a paginated list of equipment reservations
 * (healthcare_platform_equipment_reservations table).
 *
 * This operation provides an advanced search and paginated listing of equipment
 * reservations within the healthcare platform. It allows users to filter by
 * organization, resource, reservation type, appointment, and supports
 * compliance and resource management workflows.
 *
 * Security: Only authenticated system administrators (systemAdmin) may access
 * this endpoint. All access and filtering permissions must be enforced per
 * system-level RBAC, and only records authorized for global access can be
 * listed.
 *
 * @param props - Search and filter criteria, including:
 *
 *   - SystemAdmin: The authenticated system admin making the request. REQUIRED for
 *       authorization.
 *   - Body: Search/filter/pagination/sorting parameters following
 *       IHealthcarePlatformEquipmentReservation.IRequest
 *
 * @returns Paginated list of equipment reservation records, each with detailed
 *   metadata and pagination info.
 * @throws {Error} When the systemAdmin is not active or has insufficient
 *   permission; or when parameters are invalid.
 */
export async function patchhealthcarePlatformSystemAdminEquipmentReservations(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformEquipmentReservation.IRequest;
}): Promise<IPageIHealthcarePlatformEquipmentReservation> {
  const { systemAdmin, body } = props;

  // Sanity: systemAdmin must exist and be authenticated (decorator/payload contract).
  if (!systemAdmin || !systemAdmin.id) {
    throw new Error(
      "Forbidden: Missing or invalid system admin authentication.",
    );
  }

  // Only allow sort fields that exist in the Prisma schema (and thus DTO)
  const allowedSortFields = [
    "reservation_start",
    "reservation_end",
    "equipment_id",
    "reservation_type",
    "created_at",
    "updated_at",
    "deleted_at",
  ];

  // Sorting logic
  let sortField =
    body.sort_by && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "reservation_start";
  let sortOrder: "asc" | "desc" = body.sort_order === "asc" ? "asc" : "desc";

  // Pagination: enforce bounds and defaults
  let limit =
    typeof body.limit === "number" && body.limit > 0 && body.limit <= 1000
      ? body.limit
      : 20;
  let page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  let skip = (page - 1) * limit;

  // Build where clause for Prisma
  const where: Record<string, any> = {
    ...(body.healthcare_platform_organization_id !== undefined && {
      healthcare_platform_organization_id:
        body.healthcare_platform_organization_id,
    }),
    ...(body.equipment_id !== undefined && {
      equipment_id: body.equipment_id,
    }),
    ...(body.reservation_type !== undefined && {
      reservation_type: body.reservation_type,
    }),
    ...(body.appointment_id !== undefined && {
      appointment_id: body.appointment_id,
    }),
    ...(body.reservation_start_from !== undefined ||
    body.reservation_start_to !== undefined
      ? {
          reservation_start: {
            ...(body.reservation_start_from !== undefined && {
              gte: body.reservation_start_from,
            }),
            ...(body.reservation_start_to !== undefined && {
              lte: body.reservation_start_to,
            }),
          },
        }
      : {}),
    ...(body.status === "active" && { deleted_at: null }),
    ...(body.status === "archived" && { deleted_at: { not: null } }),
  };

  // Query DB for paginated rows + total
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_equipment_reservations.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_equipment_reservations.count({ where }),
  ]);

  // Map rows to DTO structure and parse all date fields
  const data: IHealthcarePlatformEquipmentReservation[] = rows.map((row) => {
    return {
      id: row.id,
      healthcare_platform_organization_id:
        row.healthcare_platform_organization_id,
      equipment_id: row.equipment_id,
      reservation_start: toISOStringSafe(row.reservation_start),
      reservation_end: toISOStringSafe(row.reservation_end),
      reservation_type: row.reservation_type,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      ...(row.appointment_id !== null
        ? { appointment_id: row.appointment_id }
        : {}), // undefined if null, per output type
      ...(row.deleted_at !== null && row.deleted_at !== undefined
        ? { deleted_at: toISOStringSafe(row.deleted_at) }
        : {}),
    };
  });

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
