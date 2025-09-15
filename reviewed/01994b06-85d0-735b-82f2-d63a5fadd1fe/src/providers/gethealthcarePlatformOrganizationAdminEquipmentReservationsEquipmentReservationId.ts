import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEquipmentReservation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEquipmentReservation";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a single equipment reservation's details by its unique identifier
 * (healthcare_platform_equipment_reservations table).
 *
 * Obtain the full detail of a specific equipment reservation using its unique
 * identifier. Used for schedule review, operational management, and compliance
 * auditing. Access is appropriately restricted to users in roles such as
 * systemAdmin, organizationAdmin, or departmentHead for the relevant
 * organization or department.
 *
 * All fields are returned as specified in the
 * healthcare_platform_equipment_reservations schema, including reservation
 * type, status, associated appointment, resource linkage, and timestamps.
 * Authorization is enforced at the organization/unit level according to user
 * assignments.
 *
 * Validation ensures the reservationId exists and the user has permission to
 * read it. Errors are returned for missing, deleted, or inaccessible
 * reservations.
 *
 * @param props.organizationAdmin - The authenticated organization administrator
 *   making the request
 * @param props.equipmentReservationId - Unique identifier of the equipment
 *   reservation record to retrieve
 * @returns Complete equipment reservation details including timestamps and IDs,
 *   or throws error if not found/forbidden
 * @throws {Error} When reservation is not found, deleted, or user is not
 *   authorized to access it
 */
export async function gethealthcarePlatformOrganizationAdminEquipmentReservationsEquipmentReservationId(props: {
  organizationAdmin: OrganizationadminPayload;
  equipmentReservationId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformEquipmentReservation> {
  const { organizationAdmin, equipmentReservationId } = props;

  const reservation =
    await MyGlobal.prisma.healthcare_platform_equipment_reservations.findFirst({
      where: {
        id: equipmentReservationId,
        deleted_at: null,
      },
    });

  if (!reservation) {
    throw new Error("Equipment reservation not found");
  }

  // Only allow reservations for this admin's organization
  if (
    reservation.healthcare_platform_organization_id !== organizationAdmin.id
  ) {
    throw new Error(
      "Forbidden: You are not authorized to view this equipment reservation",
    );
  }

  return {
    id: reservation.id,
    healthcare_platform_organization_id:
      reservation.healthcare_platform_organization_id,
    equipment_id: reservation.equipment_id,
    reservation_start: toISOStringSafe(reservation.reservation_start),
    reservation_end: toISOStringSafe(reservation.reservation_end),
    appointment_id:
      reservation.appointment_id === null ||
      typeof reservation.appointment_id === "undefined"
        ? undefined
        : reservation.appointment_id,
    reservation_type: reservation.reservation_type,
    created_at: toISOStringSafe(reservation.created_at),
    updated_at: toISOStringSafe(reservation.updated_at),
    deleted_at:
      reservation.deleted_at === null ||
      typeof reservation.deleted_at === "undefined"
        ? undefined
        : toISOStringSafe(reservation.deleted_at),
  };
}
