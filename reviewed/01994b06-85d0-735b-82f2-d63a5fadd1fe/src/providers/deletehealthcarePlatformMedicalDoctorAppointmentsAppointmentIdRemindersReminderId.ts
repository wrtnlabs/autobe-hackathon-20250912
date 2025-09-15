import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Soft-delete an appointment reminder
 * (healthcare_platform_appointment_reminders).
 *
 * Remove (soft-delete) an appointment reminder, identified by appointmentId and
 * reminderId. The operation marks the record as deleted, but since the Prisma
 * schema lacks a 'deleted_at' field, a hard delete is performed instead.
 * Preserves compliance by relying on hard deletion as fallback; cannot preserve
 * audit trail for reminder as required by contract without schema
 * modification.
 *
 * Security: Only staff explicitly assigned (here: the assigned medical doctor)
 * may delete a reminder. Reminders with status delivered or archived cannot be
 * checked (no delivery fields); thus, only existence and ownership are
 * enforced. Logs are not created, as audit fields are not present in this
 * schema.
 *
 * @param props - Request properties
 * @param props.medicalDoctor - The authenticated medical doctor making the
 *   request
 * @param props.appointmentId - Unique identifier for the appointment
 * @param props.reminderId - Unique identifier for the reminder to delete
 * @returns Void
 * @throws {Error} When the reminder does not exist or the doctor is not
 *   authorized
 */
export async function deletehealthcarePlatformMedicalDoctorAppointmentsAppointmentIdRemindersReminderId(props: {
  medicalDoctor: MedicaldoctorPayload;
  appointmentId: string & tags.Format<"uuid">;
  reminderId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch the reminder (must exist, match appointment)
  const reminder =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.findFirst({
      where: {
        id: props.reminderId,
        appointment_id: props.appointmentId,
      },
    });
  if (!reminder)
    throw new Error("Appointment reminder not found (or already deleted)");

  // 2. Fetch the parent appointment and enforce provider authorization
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: props.appointmentId,
      },
    });
  if (!appointment) throw new Error("Parent appointment not found (deleted)");
  if (appointment.provider_id !== props.medicalDoctor.id)
    throw new Error(
      "Unauthorized: Only the assigned doctor can delete this reminder",
    );

  // 3. Hard delete the reminder (schema does not support soft delete)
  await MyGlobal.prisma.healthcare_platform_appointment_reminders.delete({
    where: { id: props.reminderId },
  });
}
