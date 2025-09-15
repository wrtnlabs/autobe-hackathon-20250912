import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve detailed information on a room reservation
 * (healthcare_platform_room_reservations)
 *
 * This endpoint allows system admins to retrieve comprehensive details of a
 * room reservation by its unique identifier. The function ensures soft-deleted
 * reservations are excluded and only authorized users (system admins) can
 * access the data. All date/time fields are returned as ISO8601 strings
 * compliant with the required types. Returns all core and nullable fields
 * accurately, used for audit, compliance, and operational management.
 *
 * @param props - Parameters for the operation
 * @param props.systemAdmin - The authenticated SystemadminPayload requesting
 *   the data
 * @param props.roomReservationId - The unique identifier (UUID) of the room
 *   reservation
 * @returns The full reservation record in IHealthcarePlatformRoomReservation
 *   format
 * @throws {Error} If the room reservation does not exist or is soft deleted
 */
export async function gethealthcarePlatformSystemAdminRoomReservationsRoomReservationId(props: {
  systemAdmin: SystemadminPayload;
  roomReservationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformRoomReservation> {
  const { roomReservationId } = props;
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
  return {
    id: reservation.id,
    healthcare_platform_organization_id:
      reservation.healthcare_platform_organization_id,
    room_id: reservation.room_id,
    reservation_start: toISOStringSafe(reservation.reservation_start),
    reservation_end: toISOStringSafe(reservation.reservation_end),
    reservation_type: reservation.reservation_type,
    appointment_id:
      reservation.appointment_id === undefined
        ? undefined
        : (reservation.appointment_id ?? null),
    created_at: toISOStringSafe(reservation.created_at),
    updated_at: toISOStringSafe(reservation.updated_at),
    deleted_at:
      reservation.deleted_at === undefined
        ? undefined
        : reservation.deleted_at
          ? toISOStringSafe(reservation.deleted_at)
          : null,
  };
}
