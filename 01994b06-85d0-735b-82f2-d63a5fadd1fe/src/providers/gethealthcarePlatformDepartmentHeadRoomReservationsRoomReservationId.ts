import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Retrieve detailed information on a room reservation
 * (healthcare_platform_room_reservations)
 *
 * This endpoint allows a department head to retrieve complete details of a
 * specific room reservation by its unique identifier, so long as the
 * reservation belongs to an organization matching their (departmentHead.id).
 * Security: Only department heads with access may retrieve data. Soft-deleted
 * reservations are not returned.
 *
 * @param props - Object with departmentHead (DepartmentheadPayload) and
 *   roomReservationId (uuid)
 * @returns IHealthcarePlatformRoomReservation with all datetime fields as
 *   strings
 * @throws {Error} 404 if reservation not found or soft-deleted
 * @throws {Error} 403 if not authorized to this reservation
 */
export async function gethealthcarePlatformDepartmentHeadRoomReservationsRoomReservationId(props: {
  departmentHead: DepartmentheadPayload;
  roomReservationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformRoomReservation> {
  const { departmentHead, roomReservationId } = props;

  // 1. Check active department head exists
  const head =
    await MyGlobal.prisma.healthcare_platform_departmentheads.findFirst({
      where: { id: departmentHead.id, deleted_at: null },
    });
  if (!head) throw new Error("Department head not found");

  // 2. Fetch not soft-deleted reservation
  const reservation =
    await MyGlobal.prisma.healthcare_platform_room_reservations.findFirst({
      where: { id: roomReservationId, deleted_at: null },
    });
  if (!reservation) throw new Error("Room reservation not found");

  // 3. Scope check (MVP: org_id == head.id)
  if (reservation.healthcare_platform_organization_id !== departmentHead.id) {
    throw new Error("Forbidden: Access denied");
  }

  // 4. Map fields, converting all datetimes to string & tags.Format<'date-time'>
  return {
    id: reservation.id,
    healthcare_platform_organization_id:
      reservation.healthcare_platform_organization_id,
    room_id: reservation.room_id,
    reservation_start: toISOStringSafe(reservation.reservation_start),
    reservation_end: toISOStringSafe(reservation.reservation_end),
    reservation_type: reservation.reservation_type,
    appointment_id: reservation.appointment_id ?? undefined,
    created_at: toISOStringSafe(reservation.created_at),
    updated_at: toISOStringSafe(reservation.updated_at),
    deleted_at:
      reservation.deleted_at !== null && reservation.deleted_at !== undefined
        ? toISOStringSafe(reservation.deleted_at)
        : undefined,
  };
}
