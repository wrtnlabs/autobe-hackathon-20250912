import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Deletes (soft deletes) an appointment by unique identifier.
 *
 * This function enforces role-based access control, referential integrity, and
 * compliance hold constraints. It marks the appointment as deleted (by
 * populating deleted_at) if the user is authorized, the appointment exists and
 * is not already deleted, no finalized billing or active legal hold are
 * present. Deletes are logged in the audit subsystem. Attempts to delete
 * non-existent, protected, or unauthorized appointments will throw errors.
 *
 * @param props - Object containing required parameters.
 * @param props.medicalDoctor - Authenticated MedicaldoctorPayload for the
 *   acting provider.
 * @param props.appointmentId - Unique identifier of the appointment to delete.
 * @returns Void
 * @throws Error - When appointment does not exist or is already deleted.
 * @throws Error - When user is not the assigned provider for the appointment.
 * @throws Error - When appointment is referenced in finalized billing.
 * @throws Error - When appointment is under legal hold.
 */
export async function deletehealthcarePlatformMedicalDoctorAppointmentsAppointmentId(props: {
  medicalDoctor: MedicaldoctorPayload;
  appointmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // STEP 1: Find existing, not-deleted appointment
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { id: props.appointmentId, deleted_at: null },
    });
  if (!appointment) {
    throw new Error("Appointment does not exist or has already been deleted.");
  }

  // STEP 2: Authorization check – doctor must be provider
  if (appointment.provider_id !== props.medicalDoctor.id) {
    throw new Error(
      "Unauthorized: Only the assigned provider can delete this appointment.",
    );
  }

  // STEP 3: Block if referenced in closed billing invoice
  const billingConflict =
    await MyGlobal.prisma.healthcare_platform_billing_invoices.findFirst({
      where: {
        encounter_id: appointment.id,
        status: { notIn: ["draft", "cancelled"] },
      },
    });
  if (billingConflict) {
    throw new Error(
      "Cannot delete appointment that has finalized billing records.",
    );
  }

  // STEP 4: Block if subject to legal hold
  const legalHold =
    await MyGlobal.prisma.healthcare_platform_legal_holds.findFirst({
      where: {
        status: "active",
        subject_type: "APPOINTMENT",
        subject_id: appointment.id,
      },
    });
  if (legalHold) {
    throw new Error("Cannot delete: appointment is under legal hold.");
  }

  // STEP 5: Soft delete (set deleted_at)
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_appointments.update({
    where: { id: appointment.id },
    data: { deleted_at: now },
  });

  // STEP 6: Log audit event
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: props.medicalDoctor.id,
      organization_id: appointment.healthcare_platform_organization_id,
      action_type: "DELETE",
      related_entity_type: "APPOINTMENT",
      related_entity_id: appointment.id,
      created_at: now,
      event_context: JSON.stringify({ provider_id: props.medicalDoctor.id }),
    },
  });
}
