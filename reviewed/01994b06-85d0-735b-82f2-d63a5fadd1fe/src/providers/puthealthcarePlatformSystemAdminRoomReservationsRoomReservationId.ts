import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing room reservation (healthcare_platform_room_reservations).
 *
 * This operation updates the schedule and attributes of a room reservation
 * entity, enforcing resource conflict checks and soft delete policies. Only
 * system admins may access this route, and all modifications are subject to
 * business validation and audit.
 *
 * @param props - Operation parameters
 * @param props.systemAdmin - Authenticated system admin making the request
 * @param props.roomReservationId - ID of the reservation to update
 * @param props.body - Reservation update payload (fields to modify)
 * @returns The updated room reservation object
 * @throws {Error} If the reservation does not exist, is soft-deleted, or if
 *   there is a scheduling/resource conflict
 */
export async function puthealthcarePlatformSystemAdminRoomReservationsRoomReservationId(props: {
  systemAdmin: SystemadminPayload;
  roomReservationId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformRoomReservation.IUpdate;
}): Promise<IHealthcarePlatformRoomReservation> {
  const { systemAdmin, roomReservationId, body } = props;

  // Fetch the original reservation by ID and ensure it is not soft-deleted
  const original =
    await MyGlobal.prisma.healthcare_platform_room_reservations.findFirst({
      where: {
        id: roomReservationId,
        deleted_at: null,
      },
    });
  if (!original) {
    throw new Error("Reservation not found or has been deleted");
  }

  // Determine updated values for conflict checking
  const next_room_id =
    body.room_id !== undefined ? body.room_id : original.room_id;
  const next_start =
    body.reservation_start !== undefined
      ? body.reservation_start
      : original.reservation_start;
  const next_end =
    body.reservation_end !== undefined
      ? body.reservation_end
      : original.reservation_end;

  // Business rule: Prevent resource and schedule conflicts (overlap in same room, not soft-deleted, not this reservation)
  const conflict =
    await MyGlobal.prisma.healthcare_platform_room_reservations.findFirst({
      where: {
        id: { not: roomReservationId },
        room_id: next_room_id,
        deleted_at: null,
        reservation_start: { lt: next_end },
        reservation_end: { gt: next_start },
      },
    });
  if (conflict) {
    throw new Error(
      "Reservation conflict: room is already booked with overlapping times.",
    );
  }

  // Perform immutable update with only allowed fields
  const updated =
    await MyGlobal.prisma.healthcare_platform_room_reservations.update({
      where: { id: roomReservationId },
      data: {
        room_id: body.room_id !== undefined ? body.room_id : undefined,
        reservation_start:
          body.reservation_start !== undefined
            ? body.reservation_start
            : undefined,
        reservation_end:
          body.reservation_end !== undefined ? body.reservation_end : undefined,
        reservation_type:
          body.reservation_type !== undefined
            ? body.reservation_type
            : undefined,
        appointment_id:
          body.appointment_id !== undefined ? body.appointment_id : undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return mapped DTO (all date/datetime fields remain strings, map nullable optionals)
  return {
    id: updated.id,
    healthcare_platform_organization_id:
      updated.healthcare_platform_organization_id,
    room_id: updated.room_id,
    reservation_start: updated.reservation_start,
    reservation_end: updated.reservation_end,
    reservation_type: updated.reservation_type,
    appointment_id: updated.appointment_id ?? undefined,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
    deleted_at: updated.deleted_at ?? undefined,
  };
}
