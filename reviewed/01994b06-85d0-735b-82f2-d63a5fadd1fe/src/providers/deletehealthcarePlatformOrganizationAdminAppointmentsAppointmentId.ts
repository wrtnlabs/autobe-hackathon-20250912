import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Delete (soft) an appointment by ID in healthcare_platform_appointments table
 *
 * Deletes (soft delete via deleted_at field) an appointment by unique
 * identifier. The method enforces access control so only authorized roles
 * within the appointment's organization/department may mark it deleted.
 * Business logic checks include: existence, reference integrity, and protection
 * for appointments involved in billing or legal workflows.
 *
 * Upon success, the appointment is removed from active schedules and workflows
 * but is retained for audit and compliance. Attempts to erase an appointment
 * outside the user’s permitted scope or on protected records (e.g., closed
 * billing, locked by compliance) return appropriate errors. All delete actions
 * are logged in the audit subsystem.
 *
 * @param props - Object with the authenticated organization admin user and
 *   appointmentId
 * @param props.organizationAdmin - The authenticated organization admin payload
 * @param props.appointmentId - Unique appointment uuid
 * @returns Void
 * @throws {Error} If appointment does not exist, is already deleted, user is
 *   not authorized, or protected references prevent deletion
 */
export async function deletehealthcarePlatformOrganizationAdminAppointmentsAppointmentId(props: {
  organizationAdmin: OrganizationadminPayload;
  appointmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, appointmentId } = props;

  // 1. Fetch appointment (must exist and not already deleted)
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: appointmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        healthcare_platform_organization_id: true,
      },
    });
  if (!appointment) {
    throw new Error("Appointment not found or already deleted");
  }

  // 2. Authorization: admin must control this appointment's organization (check org assignment)
  const adminOrgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: { user_id: organizationAdmin.id },
      select: { healthcare_platform_organization_id: true },
    });
  if (
    !adminOrgAssignment ||
    adminOrgAssignment.healthcare_platform_organization_id !==
      appointment.healthcare_platform_organization_id
  ) {
    throw new Error("Unauthorized: Admin does not control this organization");
  }

  // 3. Integrity: check that appointment is not referenced in closed billing
  const closedInvoice =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: {
        encounter_id: appointment.id,
        status: { in: ["paid", "closed", "cancelled"] },
      },
      select: { id: true },
    });
  if (closedInvoice) {
    throw new Error(
      "Appointment is referenced by a closed billing invoice and cannot be deleted",
    );
  }

  // 4. Soft delete
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_appointments.update({
    where: { id: appointment.id },
    data: { deleted_at: now },
  });

  // 5. Audit log
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: organizationAdmin.id,
      organization_id: appointment.healthcare_platform_organization_id,
      action_type: "APPOINTMENT_DELETE",
      related_entity_type: "APPOINTMENT",
      related_entity_id: appointment.id,
      event_context: JSON.stringify({
        reason: "soft delete appointment",
        deleted_at: now,
      }),
      created_at: now,
    },
  });
}
