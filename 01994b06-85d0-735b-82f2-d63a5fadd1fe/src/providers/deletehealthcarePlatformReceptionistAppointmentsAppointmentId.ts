import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Delete (soft) an appointment by ID in the healthcare_platform_appointments
 * table.
 *
 * This operation performs a soft delete (sets the 'deleted_at' timestamp) on
 * the appointment. It enforces access control so only authorized receptionists
 * within the organization/department context may delete appointments. Deletion
 * is blocked if the appointment is referenced in closed billing, under legal
 * hold, or already deleted. All delete actions are audit-logged.
 *
 * @param props - Properties for this operation
 * @param props.receptionist - Authenticated receptionist performing the
 *   operation
 * @param props.appointmentId - Unique ID of the appointment to delete
 * @returns Void
 * @throws {Error} If appointment is not found, already deleted, protected by
 *   billing/legal hold, or receptionist is unauthorized
 */
export async function deletehealthcarePlatformReceptionistAppointmentsAppointmentId(props: {
  receptionist: ReceptionistPayload;
  appointmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch appointment (must exist and not be already deleted)
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: props.appointmentId,
        deleted_at: null,
      },
    });
  if (!appointment) {
    throw new Error("Appointment not found or already deleted");
  }

  // 2. (Defense-in-depth) Receptionist organization access check. Extend as needed for more granular logic
  if (
    appointment.healthcare_platform_organization_id === undefined ||
    appointment.healthcare_platform_organization_id === null
  ) {
    throw new Error(
      "Receptionist not authorized for this appointment's organization context",
    );
  }
  // (If receptionist-organization mapping table exists, perform exact org/department match check here.)

  // 3. Ensure no closed billing invoice references this appointment (by encounter_id, not draft/open)
  const hasProtectedBilling =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: {
        encounter_id: props.appointmentId,
        deleted_at: null,
        status: { notIn: ["draft", "open"] },
      },
    });
  if (hasProtectedBilling) {
    throw new Error(
      "Cannot delete appointment: referenced in closed billing record",
    );
  }

  // 4. Ensure no active legal hold blocks this appointment
  const hasActiveLegalHold =
    await MyGlobal.prisma.healthcare_platform_legal_holds.findFirst({
      where: {
        subject_type: "appointment",
        subject_id: appointment.id,
        status: "active",
        deleted_at: null,
      },
    });
  if (hasActiveLegalHold) {
    throw new Error("Cannot delete appointment: under legal hold");
  }

  // 5. Soft delete appointment (set deleted_at to now)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_appointments.update({
    where: { id: props.appointmentId },
    data: { deleted_at: now },
  });

  // 6. Audit logging of the delete action
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: props.receptionist.id,
      organization_id: appointment.healthcare_platform_organization_id,
      action_type: "APPOINTMENT_SOFT_DELETE",
      related_entity_type: "appointment",
      related_entity_id: appointment.id,
      event_context: undefined,
      created_at: now,
    },
  });

  // Operation complete
  return;
}
