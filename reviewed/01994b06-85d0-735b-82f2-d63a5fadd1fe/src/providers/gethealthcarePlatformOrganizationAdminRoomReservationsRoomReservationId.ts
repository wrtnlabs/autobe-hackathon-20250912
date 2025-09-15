import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRoomReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRoomReservation";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve detailed information on a room reservation
 * (healthcare_platform_room_reservations)
 *
 * This operation retrieves detailed information about a specific room
 * reservation from the healthcarePlatform's scheduling domain. System and
 * organization admins may use this endpoint to obtain time window, reservation
 * type, associated appointment (if any), and audit timestamps. Access is
 * authorized only if the organization admin owns the organization referenced by
 * the room reservation. Soft-deleted room reservations (deleted_at != null) are
 * never returned.
 *
 * @param props - Method parameters
 * @param props.organizationAdmin - Authenticated organization admin payload
 *   (must match organization owner)
 * @param props.roomReservationId - The unique uuid of the target room
 *   reservation
 * @returns The complete room reservation details for the given id
 * @throws {Error} If the reservation does not exist, is soft-deleted, or the
 *   admin does not own the reservation (Forbidden)
 */
export async function gethealthcarePlatformOrganizationAdminRoomReservationsRoomReservationId(props: {
  organizationAdmin: OrganizationadminPayload;
  roomReservationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformRoomReservation> {
  const { organizationAdmin, roomReservationId } = props;

  const reservation =
    await MyGlobal.prisma.healthcare_platform_room_reservations.findFirst({
      where: {
        id: roomReservationId,
        deleted_at: null,
      },
    });

  if (!reservation) {
    throw new Error("Room reservation not found"); // 404
  }

  // Authorization: must belong to admin's organization
  if (
    reservation.healthcare_platform_organization_id !== organizationAdmin.id
  ) {
    throw new Error(
      "Forbidden: Room reservation does not belong to admin's organization",
    ); // 403
  }

  return {
    id: reservation.id,
    healthcare_platform_organization_id:
      reservation.healthcare_platform_organization_id,
    room_id: reservation.room_id,
    reservation_start: toISOStringSafe(reservation.reservation_start),
    reservation_end: toISOStringSafe(reservation.reservation_end),
    reservation_type: reservation.reservation_type,
    appointment_id: reservation.appointment_id ?? undefined,
    created_at: toISOStringSafe(reservation.created_at),
    updated_at: toISOStringSafe(reservation.updated_at),
    deleted_at: reservation.deleted_at
      ? toISOStringSafe(reservation.deleted_at)
      : undefined,
  };
}
