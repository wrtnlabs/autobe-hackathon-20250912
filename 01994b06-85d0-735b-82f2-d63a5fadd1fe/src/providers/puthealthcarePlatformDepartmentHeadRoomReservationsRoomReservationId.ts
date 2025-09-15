import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Update an existing room reservation (healthcare_platform_room_reservations)
 *
 * Allows scheduling staff (Department Heads) to update the attributes of a
 * specific room reservation, such as reservation time, room assignment,
 * reservation type, or linkage to appointment.
 *
 * Only department heads may update a reservation; actions are audited for
 * compliance and resource conflict review. Soft-deleted reservations
 * (deleted_at != null) cannot be updated.
 *
 * @param props - Request properties
 * @param props.departmentHead - The authenticated department head user
 *   performing the update
 * @param props.roomReservationId - UUID of the room reservation to update
 * @param props.body - Updated data (partial) for room reservation
 *   (IHealthcarePlatformRoomReservation.IUpdate)
 * @returns The updated room reservation record reflecting the new schedule or
 *   attributes
 * @throws {Error} If the reservation does not exist or has been soft deleted
 *   (deleted_at != null)
 */
export async function puthealthcarePlatformDepartmentHeadRoomReservationsRoomReservationId(props: {
  departmentHead: DepartmentheadPayload;
  roomReservationId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformRoomReservation.IUpdate;
}): Promise<IHealthcarePlatformRoomReservation> {
  const { roomReservationId, body } = props;

  // Step 1: Fetch existing record and verify it exists and is not deleted
  const record =
    await MyGlobal.prisma.healthcare_platform_room_reservations.findFirst({
      where: {
        id: roomReservationId,
        deleted_at: null,
      },
    });
  if (!record) {
    throw new Error("Room reservation not found or is deleted");
  }

  // Step 2: Build update object from present fields only
  const updateData = {
    ...(body.room_id !== undefined && { room_id: body.room_id }),
    ...(body.reservation_start !== undefined && {
      reservation_start: body.reservation_start,
    }),
    ...(body.reservation_end !== undefined && {
      reservation_end: body.reservation_end,
    }),
    ...(body.reservation_type !== undefined && {
      reservation_type: body.reservation_type,
    }),
    ...(body.appointment_id !== undefined && {
      appointment_id: body.appointment_id,
    }),
    updated_at: toISOStringSafe(new Date()),
  };

  // Step 3: Update the reservation
  const updated =
    await MyGlobal.prisma.healthcare_platform_room_reservations.update({
      where: { id: roomReservationId },
      data: updateData,
    });

  // Step 4: Prepare typed return object, formatting all Date fields
  return {
    id: updated.id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id,
    room_id: updated.room_id,
    reservation_start: toISOStringSafe(updated.reservation_start),
    reservation_end: toISOStringSafe(updated.reservation_end),
    reservation_type: updated.reservation_type,
    appointment_id: updated.appointment_id ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
