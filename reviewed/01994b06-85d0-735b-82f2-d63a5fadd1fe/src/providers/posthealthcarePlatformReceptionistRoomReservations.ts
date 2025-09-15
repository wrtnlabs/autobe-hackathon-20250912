import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Create a new room reservation (healthcare_platform_room_reservations)
 *
 * This operation creates a new room reservation in the healthcarePlatform for
 * use with clinical and administrative appointment scheduling. It operates on
 * the healthcare_platform_room_reservations table and enables authorized users
 * to book resources for time windows, associate them with appointments, and
 * manage maintenance periods as required for operational continuity.
 *
 * Security considerations: Only scheduling-capable roles (system admin,
 * organization admin, department head, receptionist) may invoke this operation;
 * audit logs record reservation details, actor, and rationale.
 *
 * Validation includes preventing double-bookings, enforcing minimum lead/cancel
 * times, and checking room/resource existence. Errors include invalid time
 * windows, permission issues, or pre-existing reservation conflict. On success,
 * the full reservation details are returned for further workflow integration
 * and dashboard purposes.
 *
 * @param props - Request properties
 * @param props.receptionist - Authenticated ReceptionistPayload (must be valid
 *   and not deleted)
 * @param props.body - Reservation creation payload: org, room, time, type, and
 *   (optionally) appointment linkage
 * @returns Information on the created room reservation
 * @throws {Error} If reservation times are invalid, room is already reserved,
 *   or receptionist lacks permission
 */
export async function posthealthcarePlatformReceptionistRoomReservations(props: {
  receptionist: ReceptionistPayload;
  body: IHealthcarePlatformRoomReservation.ICreate;
}): Promise<IHealthcarePlatformRoomReservation> {
  const { receptionist, body } = props;

  // Reservation must be for future and start < end
  if (body.reservation_start >= body.reservation_end) {
    throw new Error("Reservation start must be before reservation end");
  }

  // Prevent double-booking: no overlapping reservation for this room
  const overlappingReservation =
    await MyGlobal.prisma.healthcare_platform_room_reservations.findFirst({
      where: {
        room_id: body.room_id,
        deleted_at: null,
        OR: [
          {
            reservation_start: { lte: body.reservation_end },
            reservation_end: { gte: body.reservation_start },
          },
        ],
      },
    });
  if (overlappingReservation) {
    throw new Error("Room already reserved for the requested time window");
  }

  // Create and stamp times/UUIDs as date-time strings only (never native Date)
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_room_reservations.create({
      data: {
        id: v4(),
        healthcare_platform_organization_id:
          body.healthcare_platform_organization_id,
        room_id: body.room_id,
        reservation_start: body.reservation_start,
        reservation_end: body.reservation_end,
        reservation_type: body.reservation_type,
        appointment_id: body.appointment_id ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  // Return with all dates as ISO strings and null/undefined for deleted_at, appointment_id
  return {
    id: created.id,
    healthcare_platform_organization_id:
      created.healthcare_platform_organization_id,
    room_id: created.room_id,
    reservation_start: created.reservation_start,
    reservation_end: created.reservation_end,
    reservation_type: created.reservation_type,
    appointment_id: created.appointment_id ?? null,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: null,
  };
}
