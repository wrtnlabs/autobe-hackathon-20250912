import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";
import { IPageIHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEquipmentReservation";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve a paginated list of equipment reservations
 * (healthcare_platform_equipment_reservations table).
 *
 * Retrieves a filtered and paginated list of equipment reservations for the
 * healthcare platform, scoped to the authenticated organization admin's
 * organization. Users can filter by equipment, reservation type, appointment,
 * and date range. Pagination and sorting are supported. Organization admins can
 * only access records for their organization. All date/datetime fields are
 * formatted as ISO 8601 strings using toISOStringSafe().
 *
 * @param props - Properties including authenticated organization admin and
 *   search/filter criteria.
 * @param props.organizationAdmin - The authenticated organization admin making
 *   the request.
 * @param props.body - Advanced filtering, sorting, and pagination options.
 * @returns Paginated list of equipment reservations, with pagination metadata
 *   and correct date/datetime formatting.
 * @throws {Error} If filtering attempts to access another organization or uses
 *   invalid pagination values.
 */
export async function patchhealthcarePlatformOrganizationAdminEquipmentReservations(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformEquipmentReservation.IRequest;
}): Promise<IPageIHealthcarePlatformEquipmentReservation> {
  const { organizationAdmin, body } = props;

  // Enforce RBAC: Only allow querying reservations for the organization's own ID
  if (
    body.healthcare_platform_organization_id !== undefined &&
    body.healthcare_platform_organization_id !== organizationAdmin.id
  ) {
    throw new Error(
      "You are only allowed to list reservations for your own organization.",
    );
  }

  // Defaults for pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Supported sort fields
  const allowedFields = [
    "reservation_start",
    "reservation_end",
    "created_at",
    "updated_at",
    "reservation_type",
    "equipment_id",
    "id",
  ];
  const sortBy =
    body.sort_by && allowedFields.includes(body.sort_by)
      ? body.sort_by
      : "reservation_start";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // WHERE clause, only including valid filters
  const where: Record<string, unknown> = {
    healthcare_platform_organization_id: organizationAdmin.id,
    deleted_at: null,
    ...(body.equipment_id !== undefined && { equipment_id: body.equipment_id }),
    ...(body.appointment_id !== undefined && {
      appointment_id: body.appointment_id,
    }),
    ...(body.reservation_type !== undefined && {
      reservation_type: body.reservation_type,
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
  };

  // Main query and total in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_equipment_reservations.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_equipment_reservations.count({ where }),
  ]);

  // Transform Prisma records to DTOs (no use of as or Date)
  const data = rows.map((row) => ({
    id: row.id,
    healthcare_platform_organization_id:
      row.healthcare_platform_organization_id,
    equipment_id: row.equipment_id,
    reservation_start: toISOStringSafe(row.reservation_start),
    reservation_end: toISOStringSafe(row.reservation_end),
    appointment_id: row.appointment_id ?? undefined,
    reservation_type: row.reservation_type,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== null && row.deleted_at !== undefined
        ? toISOStringSafe(row.deleted_at)
        : undefined,
  }));

  return {
    pagination: {
      current: Number(page), // Ensure correct type
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
