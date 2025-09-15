import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";
import { IPageIHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformRoomReservation";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Search and retrieve a filtered, paginated list of room reservation records
 * (healthcare_platform_room_reservations)
 *
 * Enables searching and retrieval of room reservation records within an
 * organization, using advanced filters for resource, reservation period,
 * status, and type. Only department head users can access this endpoint; all
 * data is scoped to the department head's organization.
 *
 * @param props - Request properties
 * @param props.departmentHead - The authenticated department head making the
 *   request
 * @param props.body - Filter and pagination query for room reservations
 * @returns Paginated list of matching room reservation summary records and
 *   metadata
 * @throws {Error} When the department head is not found or inactive
 */
export async function patchhealthcarePlatformDepartmentHeadRoomReservations(props: {
  departmentHead: DepartmentheadPayload;
  body: IHealthcarePlatformRoomReservation.IRequest;
}): Promise<IPageIHealthcarePlatformRoomReservation.ISummary> {
  const { departmentHead, body } = props;
  const departmentHeadRecord =
    await MyGlobal.prisma.healthcare_platform_departmentheads.findFirst({
      where: { id: departmentHead.id, deleted_at: null },
    });
  if (!departmentHeadRecord)
    throw new Error("Department head not found or inactive");

  // Organization-based isolation
  const orgId =
    body.healthcare_platform_organization_id !== undefined
      ? body.healthcare_platform_organization_id
      : undefined;
  if (orgId !== undefined && orgId !== departmentHeadRecord.id) {
    // If an explicit org id is requested, must match department head's org id
    throw new Error("Access denied to the specified organization");
  }
  // Always restrict to org of the dept head (assume id is org for head, per schema snippet)
  const where: Record<string, unknown> = {
    healthcare_platform_organization_id: departmentHeadRecord.id,
    ...(body.room_id !== undefined && { room_id: body.room_id }),
    ...(body.reservation_type !== undefined && {
      reservation_type: body.reservation_type,
    }),
    ...(body.appointment_id !== undefined && {
      appointment_id: body.appointment_id,
    }),
    ...((body.reservation_start !== undefined ||
      body.reservation_end !== undefined) && {
      reservation_start: {
        ...(body.reservation_start !== undefined && {
          gte: body.reservation_start,
        }),
        ...(body.reservation_end !== undefined && {
          lte: body.reservation_end,
        }),
      },
    }),
    ...((body.created_at_from !== undefined ||
      body.created_at_to !== undefined) && {
      created_at: {
        ...(body.created_at_from !== undefined && {
          gte: body.created_at_from,
        }),
        ...(body.created_at_to !== undefined && { lte: body.created_at_to }),
      },
    }),
    ...((body.updated_at_from !== undefined ||
      body.updated_at_to !== undefined) && {
      updated_at: {
        ...(body.updated_at_from !== undefined && {
          gte: body.updated_at_from,
        }),
        ...(body.updated_at_to !== undefined && { lte: body.updated_at_to }),
      },
    }),
  };
  // Soft delete filter handling
  if (Object.prototype.hasOwnProperty.call(body, "deleted_at")) {
    if (body.deleted_at === null) where.deleted_at = null;
    else where.deleted_at = body.deleted_at;
  } else {
    where.deleted_at = null;
  }

  const page = body.page ?? 1;
  const pageSize = body.pageSize ?? 20;
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_room_reservations.findMany({
      where,
      orderBy: { reservation_start: "desc" },
      skip,
      take,
    }),
    MyGlobal.prisma.healthcare_platform_room_reservations.count({ where }),
  ]);

  const data = rows.map((r) => ({
    id: r.id,
    healthcare_platform_organization_id: r.healthcare_platform_organization_id,
    room_id: r.room_id,
    reservation_start: toISOStringSafe(r.reservation_start),
    reservation_end: toISOStringSafe(r.reservation_end),
    reservation_type: r.reservation_type,
    appointment_id: r.appointment_id ?? undefined,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
    deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data,
  };
}
