import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Delete a room reservation by ID (healthcare_platform_room_reservations)
 *
 * This operation permforms a soft delete of a room reservation by setting its
 * `deleted_at` field to the current timestamp. Only authorized system admins
 * may erase a room reservation.
 *
 * - The endpoint finds a reservation with the given UUID not already deleted
 * - If not found, throws a 404 error
 * - Marks the reservation as deleted (deleted_at = now)
 * - Complies with audit requirement by raising if not found and performs a
 *   soft-delete, in line with Prisma schema design
 *
 * @param props - Contains the authenticated system admin and the UUID of the
 *   room reservation to delete
 * @param props.systemAdmin - Authenticated system admin (authorization
 *   performed via decorator)
 * @param props.roomReservationId - Unique identifier for the room reservation
 * @returns Void
 * @throws {Error} 404 when the specified reservation is not found or already
 *   deleted
 */
export async function deletehealthcarePlatformSystemAdminRoomReservationsRoomReservationId(props: {
  systemAdmin: SystemadminPayload;
  roomReservationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { roomReservationId } = props;
  // Attempt to locate the reservation by ID, only if not already soft-deleted
  const reservation =
    await MyGlobal.prisma.healthcare_platform_room_reservations.findFirst({
      where: {
        id: roomReservationId,
        deleted_at: null,
      },
    });
  if (!reservation) {
    throw new Error("Room reservation not found");
  }
  // Soft-delete by marking deleted_at (and updated_at) to now
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_room_reservations.update({
    where: { id: roomReservationId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // No value returned (endpoint returns 204 No Content)
}
