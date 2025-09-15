import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new room reservation (healthcare_platform_room_reservations)
 *
 * Creates a new room reservation within the healthcare platform, supporting
 * workflows for appointment booking, maintenance, and event management. Only
 * system administrators and authorized scheduling roles may invoke this
 * operation.
 *
 * Main responsibilities:
 *
 * - Prevent double-booking for the same room and time window (hard check)
 * - Assigns reservation to specified organization, room, type, and time window
 * - Optionally associates with an appointment (nullable)
 *
 * Validates time logic and enforces resource exclusivity. Throws an error if
 * any active reservation overlaps with the provided window.
 *
 * @param props - Properties for the operation
 * @param props.systemAdmin - Authenticated system admin performing this
 *   operation
 * @param props.body - Reservation creation details (room, org, window, type,
 *   optional appointment)
 * @returns Newly created room reservation record
 * @throws Error if a conflicting reservation exists for the given room and time
 *   window
 */
export async function posthealthcarePlatformSystemAdminRoomReservations(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformRoomReservation.ICreate;
}): Promise<IHealthcarePlatformRoomReservation> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Double-booking check (exclusive reservation): overlapping (start < end, end > start), active only
  const exists =
    await MyGlobal.prisma.healthcare_platform_room_reservations.findFirst({
      where: {
        room_id: props.body.room_id,
        deleted_at: null,
        // Overlaps if: requested start < existing end AND requested end > existing start
        reservation_start: { lt: props.body.reservation_end },
        reservation_end: { gt: props.body.reservation_start },
      },
    });
  if (exists) {
    throw new Error("Room is already booked for this time.");
  }

  // Create reservation (all fields inline, no as, no Date usage)
  const result =
    await MyGlobal.prisma.healthcare_platform_room_reservations.create({
      data: {
        id: v4(),
        healthcare_platform_organization_id:
          props.body.healthcare_platform_organization_id,
        room_id: props.body.room_id,
        reservation_start: props.body.reservation_start,
        reservation_end: props.body.reservation_end,
        reservation_type: props.body.reservation_type,
        appointment_id: props.body.appointment_id ?? undefined,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: result.id,
    healthcare_platform_organization_id:
      result.healthcare_platform_organization_id,
    room_id: result.room_id,
    reservation_start: result.reservation_start,
    reservation_end: result.reservation_end,
    reservation_type: result.reservation_type,
    appointment_id: result.appointment_id ?? undefined,
    created_at: result.created_at,
    updated_at: result.updated_at,
    deleted_at: result.deleted_at ?? undefined,
  };
}
