import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Permanently delete an equipment reservation in the
 * healthcare_platform_equipment_reservations table.
 *
 * This operation allows an organization administrator to remove an equipment
 * reservation by ID, freeing the equipment for future use. It is only permitted
 * if the reservation belongs to the admin's organization and is not linked to
 * an active appointment or a maintenance block. All deletions are hard deletes
 * (permanently removing the record) and are strictly audited for compliance.
 *
 * Security: Only organization admins of the reservation's organization may
 * perform this operation. Attempts to delete another organization's
 * reservation, delete a reservation linked to an appointment, or delete a
 * maintenance block will result in an error.
 *
 * @param props - The input properties for the operation.
 * @param props.organizationAdmin - OrganizationadminPayload for the
 *   authenticated admin (provides organization context).
 * @param props.equipmentReservationId - The UUID of the equipment reservation
 *   to delete.
 * @returns Void
 * @throws {Error} If the reservation is not found, is outside organization
 *   scope, is linked to an appointment, or is a maintenance block.
 */
export async function deletehealthcarePlatformOrganizationAdminEquipmentReservationsEquipmentReservationId(props: {
  organizationAdmin: OrganizationadminPayload;
  equipmentReservationId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, equipmentReservationId } = props;

  // Step 1: Fetch reservation by ID
  const reservation =
    await MyGlobal.prisma.healthcare_platform_equipment_reservations.findFirst({
      where: { id: equipmentReservationId },
    });
  if (!reservation) {
    throw new Error("Reservation not found");
  }

  // Step 2: Enforce organizational scope
  if (
    reservation.healthcare_platform_organization_id !== organizationAdmin.id
  ) {
    throw new Error(
      "Forbidden: Reservation does not belong to your organization",
    );
  }

  // Step 3: Prevent deletion if linked to appointment
  if (reservation.appointment_id !== null) {
    throw new Error("Cannot delete reservation linked to an appointment");
  }

  // Step 4: Prevent deletion of maintenance blocks
  if (reservation.reservation_type === "maintenance") {
    throw new Error("Cannot delete maintenance block reservation");
  }

  // Step 5: Hard delete the reservation
  await MyGlobal.prisma.healthcare_platform_equipment_reservations.delete({
    where: { id: equipmentReservationId },
  });

  // Step 6: Write an audit log (ID required!)
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: organizationAdmin.id,
      organization_id: organizationAdmin.id,
      action_type: "DELETE_EQUIPMENT_RESERVATION",
      event_context: JSON.stringify({ reservationId: equipmentReservationId }),
      created_at: toISOStringSafe(new Date()),
    },
  });
}
