import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";
import { IPageIHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformRoomReservation";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve a filtered, paginated list of room reservation records
 * (healthcare_platform_room_reservations)
 *
 * Enables authenticated organization administrators to search, filter, and
 * paginate room reservation records within their own organization. Only
 * reservations in the requesting admin's organization are returned. Supports
 * filtering by room, reservation type, appointment, date range, and other
 * properties. All filters are optional except for organization scope. Results
 * are paginated and sorted by most recent created_at. Search activity is logged
 * for compliance.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated organization admin
 *   (OrganizationadminPayload)
 * @param props.body - Filter and pagination parameters for room reservations
 * @returns Paginated list of room reservation summaries and pagination metadata
 * @throws {Error} If authentication is missing or organizational boundary is
 *   violated
 */
export async function patchhealthcarePlatformOrganizationAdminRoomReservations(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformRoomReservation.IRequest;
}): Promise<IPageIHealthcarePlatformRoomReservation.ISummary> {
  const { organizationAdmin, body } = props;
  if (!organizationAdmin || !organizationAdmin.id) {
    throw new Error("Missing or invalid organization admin authentication.");
  }
  const organizationId = organizationAdmin.id;

  // Pagination logic
  const rawPage = body.page ?? 1;
  const rawPageSize = body.pageSize ?? 20;
  const page = rawPage < 1 ? 1 : rawPage;
  const pageSize = rawPageSize < 1 ? 20 : rawPageSize;
  const skip = (page - 1) * pageSize;

  // Build where clause for Prisma
  const where = {
    healthcare_platform_organization_id: organizationId,
    ...(body.room_id !== undefined &&
      body.room_id !== null && {
        room_id: body.room_id,
      }),
    ...(body.reservation_type !== undefined &&
      body.reservation_type !== null && {
        reservation_type: body.reservation_type,
      }),
    ...(body.appointment_id !== undefined &&
      body.appointment_id !== null && {
        appointment_id: body.appointment_id,
      }),
    ...(body.reservation_start !== undefined &&
      body.reservation_start !== null && {
        reservation_start: { gte: body.reservation_start },
      }),
    ...(body.reservation_end !== undefined &&
      body.reservation_end !== null && {
        reservation_end: { lte: body.reservation_end },
      }),
    ...(body.created_at_from !== undefined &&
      body.created_at_from !== null && {
        created_at: { gte: body.created_at_from },
      }),
    ...(body.created_at_to !== undefined &&
      body.created_at_to !== null && {
        created_at: { lte: body.created_at_to },
      }),
    ...(body.updated_at_from !== undefined &&
      body.updated_at_from !== null && {
        updated_at: { gte: body.updated_at_from },
      }),
    ...(body.updated_at_to !== undefined &&
      body.updated_at_to !== null && {
        updated_at: { lte: body.updated_at_to },
      }),
    ...(body.deleted_at !== undefined && {
      deleted_at: body.deleted_at, // allow null/undefined: match exactly
    }),
  };

  // Query the rows and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_room_reservations.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: pageSize,
    }),
    MyGlobal.prisma.healthcare_platform_room_reservations.count({ where }),
  ]);

  // Map results for output with strict conversion
  const data = rows.map((row) => {
    return {
      id: row.id,
      healthcare_platform_organization_id:
        row.healthcare_platform_organization_id,
      room_id: row.room_id,
      reservation_start: toISOStringSafe(row.reservation_start),
      reservation_end: toISOStringSafe(row.reservation_end),
      reservation_type: row.reservation_type,
      appointment_id:
        row.appointment_id === undefined
          ? undefined
          : (row.appointment_id ?? null),
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at !== undefined
          ? row.deleted_at === null
            ? null
            : toISOStringSafe(row.deleted_at)
          : undefined,
    };
  });

  // Log search activity for compliance
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: organizationAdmin.id,
      organization_id: organizationAdmin.id,
      action_type: "ROOM_RESERVATION_SEARCH",
      event_context: JSON.stringify(body),
      created_at: toISOStringSafe(new Date()),
    },
  });

  // Pagination construction: remove brand for page/limit as required
  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(pageSize)),
    },
    data,
  };
}
