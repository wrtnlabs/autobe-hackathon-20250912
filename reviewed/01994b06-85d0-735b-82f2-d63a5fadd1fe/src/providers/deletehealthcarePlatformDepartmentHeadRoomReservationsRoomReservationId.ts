import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Delete a room reservation by ID (healthcare_platform_room_reservations)
 *
 * This operation soft-deletes a room reservation in the healthcarePlatform
 * system. It sets the deleted_at field to the current time for the specified
 * reservation if it exists and is not already deleted.
 *
 * Authorization: Only authenticated department heads may perform this
 * operation. The controller is expected to enforce this requirement.
 *
 * @param props - The operation parameters
 * @param props.departmentHead - Authenticated department head user (payload)
 * @param props.roomReservationId - UUID of the room reservation to delete
 * @returns Void
 * @throws {Error} If the reservation does not exist or is already deleted
 */
export async function deletehealthcarePlatformDepartmentHeadRoomReservationsRoomReservationId(props: {
  departmentHead: DepartmentheadPayload;
  roomReservationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { departmentHead, roomReservationId } = props;
  const reservation =
    await MyGlobal.prisma.healthcare_platform_room_reservations.findFirst({
      where: { id: roomReservationId, deleted_at: null },
    });
  if (!reservation) throw new Error("Room reservation not found");
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_room_reservations.update({
    where: { id: roomReservationId },
    data: { deleted_at: now },
  });
}
