import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Retrieve detailed information on a room reservation
 * (healthcare_platform_room_reservations)
 *
 * This function retrieves a room reservation by ID for an authenticated
 * receptionist. Soft-deleted records are not returned. Organization-based
 * access control is not enforced in this function because the receptionist
 * table does not contain organization linkage in the current schema.
 *
 * @param props - Object containing the authenticated receptionist and the Room
 *   Reservation's UUID
 * @returns The matching room reservation record mapped as an
 *   IHealthcarePlatformRoomReservation
 * @throws {Error} 404 when the reservation is not found
 */
export async function gethealthcarePlatformReceptionistRoomReservationsRoomReservationId(props: {
  receptionist: ReceptionistPayload;
  roomReservationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformRoomReservation> {
  const { roomReservationId } = props;

  // Lookup reservation by ID and not soft-deleted
  const roomReservation =
    await MyGlobal.prisma.healthcare_platform_room_reservations.findFirst({
      where: {
        id: roomReservationId,
        deleted_at: null,
      },
    });
  if (!roomReservation) throw new Error("Room reservation not found"); // 404

  return {
    id: roomReservation.id,
    healthcare_platform_organization_id:
      roomReservation.healthcare_platform_organization_id,
    room_id: roomReservation.room_id,
    reservation_start: toISOStringSafe(roomReservation.reservation_start),
    reservation_end: toISOStringSafe(roomReservation.reservation_end),
    reservation_type: roomReservation.reservation_type,
    appointment_id: roomReservation.appointment_id ?? undefined,
    created_at: toISOStringSafe(roomReservation.created_at),
    updated_at: toISOStringSafe(roomReservation.updated_at),
    deleted_at:
      roomReservation.deleted_at === null
        ? undefined
        : toISOStringSafe(roomReservation.deleted_at),
  };
}
