import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Delete a room reservation by ID (healthcare_platform_room_reservations)
 *
 * This endpoint permanently (soft) deletes a room reservation from the
 * healthcarePlatform system by setting its deleted_at timestamp. Only
 * authenticated receptionists may delete room reservations; action is
 * audit-logged elsewhere in the system. If the reservation does not exist or is
 * already deleted, a 404 error is thrown.
 *
 * @param props - The input containing the authenticated receptionist payload
 *   and room reservation ID to delete
 * @param props.receptionist - The authenticated receptionist performing the
 *   operation
 * @param props.roomReservationId - The unique identifier of the room
 *   reservation to be deleted
 * @returns Void
 * @throws {Error} If the room reservation does not exist or is already deleted
 */
export async function deletehealthcarePlatformReceptionistRoomReservationsRoomReservationId(props: {
  receptionist: ReceptionistPayload;
  roomReservationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { roomReservationId } = props;

  // Query to ensure the reservation exists and hasn't already been deleted
  const reservation =
    await MyGlobal.prisma.healthcare_platform_room_reservations.findFirst({
      where: {
        id: roomReservationId,
        deleted_at: null,
      },
    });
  if (!reservation) {
    throw new Error("Room reservation not found or already deleted");
  }

  // Soft delete the reservation by setting deleted_at to the current timestamp
  await MyGlobal.prisma.healthcare_platform_room_reservations.update({
    where: { id: roomReservationId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
