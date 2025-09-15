import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve the full detail of a specific equipment reservation by its unique
 * identifier.
 *
 * This operation fetches all reservation metadata as defined by the Prisma
 * schema, ensuring each field is handled according to system date and branding
 * conventions. Only active (non-deleted) reservations are retrievable. Intended
 * for use by system admins for audit, compliance, and operational review.
 *
 * @param props - Request properties
 * @param props.systemAdmin - Authenticated system admin payload required for
 *   RBAC
 * @param props.equipmentReservationId - The UUID of the reservation record to
 *   retrieve
 * @returns The complete equipment reservation detail with all fields including
 *   assignment, resource, timestamps
 * @throws {Error} If the reservation ID does not exist or the reservation is
 *   deleted
 */
export async function gethealthcarePlatformSystemAdminEquipmentReservationsEquipmentReservationId(props: {
  systemAdmin: SystemadminPayload;
  equipmentReservationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformEquipmentReservation> {
  const { equipmentReservationId } = props;

  const reservation =
    await MyGlobal.prisma.healthcare_platform_equipment_reservations.findUnique(
      {
        where: { id: equipmentReservationId },
        select: {
          id: true,
          healthcare_platform_organization_id: true,
          equipment_id: true,
          reservation_start: true,
          reservation_end: true,
          appointment_id: true,
          reservation_type: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );

  if (!reservation || reservation.deleted_at !== null) {
    throw new Error("Equipment reservation not found or has been deleted");
  }

  return {
    id: reservation.id,
    healthcare_platform_organization_id:
      reservation.healthcare_platform_organization_id,
    equipment_id: reservation.equipment_id,
    reservation_start: toISOStringSafe(reservation.reservation_start),
    reservation_end: toISOStringSafe(reservation.reservation_end),
    appointment_id:
      reservation.appointment_id === null
        ? undefined
        : reservation.appointment_id,
    reservation_type: reservation.reservation_type,
    created_at: toISOStringSafe(reservation.created_at),
    updated_at: toISOStringSafe(reservation.updated_at),
    deleted_at:
      reservation.deleted_at === null || reservation.deleted_at === undefined
        ? undefined
        : toISOStringSafe(reservation.deleted_at),
  };
}
