import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Update an existing room reservation (healthcare_platform_room_reservations)
 *
 * Allows scheduling staff (receptionists) to update key fields of a specific
 * room reservation, such as reservation time, room assignment, reservation
 * type, or linkage to an appointment. Only authorized roles may perform the
 * update. A soft-deleted reservation cannot be updated. All actions are audited
 * via updated_at.
 *
 * @param props - Properties for the update operation
 * @param props.receptionist - The authenticated receptionist making the update
 *   request
 * @param props.roomReservationId - UUID of the room reservation to update
 * @param props.body - Fields to update (room_id, times, type, appointment link)
 * @returns The updated room reservation reflecting new values
 * @throws {Error} If not found or soft-deleted
 */
export async function puthealthcarePlatformReceptionistRoomReservationsRoomReservationId(props: {
  receptionist: ReceptionistPayload;
  roomReservationId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformRoomReservation.IUpdate;
}): Promise<IHealthcarePlatformRoomReservation> {
  const { receptionist, roomReservationId, body } = props;
  // 1. Lookup reservation (must not be soft-deleted)
  const reservation =
    await MyGlobal.prisma.healthcare_platform_room_reservations.findFirst({
      where: {
        id: roomReservationId,
        deleted_at: null,
      },
    });
  if (!reservation) {
    throw new Error("Room reservation not found or has been deleted.");
  }
  // 2. Ensure receptionist exists and is active
  const receptionistRecord =
    await MyGlobal.prisma.healthcare_platform_receptionists.findFirst({
      where: {
        id: receptionist.id,
        deleted_at: null,
      },
    });
  if (!receptionistRecord) {
    throw new Error("Receptionist does not exist or is not active.");
  }
  // 3. Update allowed fields
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_room_reservations.update({
      where: { id: roomReservationId },
      data: {
        room_id: body.room_id ?? undefined,
        reservation_start: body.reservation_start ?? undefined,
        reservation_end: body.reservation_end ?? undefined,
        reservation_type: body.reservation_type ?? undefined,
        appointment_id:
          typeof body.appointment_id !== "undefined"
            ? body.appointment_id
            : undefined,
        updated_at: now,
      },
    });
  return {
    id: updated.id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id,
    room_id: updated.room_id,
    reservation_start: toISOStringSafe(updated.reservation_start),
    reservation_end: toISOStringSafe(updated.reservation_end),
    reservation_type: updated.reservation_type,
    appointment_id:
      typeof updated.appointment_id !== "undefined"
        ? updated.appointment_id
        : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
