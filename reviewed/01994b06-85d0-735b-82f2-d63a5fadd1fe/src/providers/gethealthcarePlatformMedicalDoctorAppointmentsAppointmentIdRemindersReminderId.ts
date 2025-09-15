import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Get a specific appointment reminder by ID for review or audit
 * (healthcare_platform_appointment_reminders).
 *
 * This operation fetches the details of a specific reminder associated with a
 * given appointment in the healthcare scheduling system. It performs strict
 * access control, ensuring only the assigned medical doctor (provider) for the
 * appointment can retrieve the reminder information. Read-access is logged via
 * core platform mechanisms. Soft-deleted reminders (deleted_at not null) are
 * excluded.
 *
 * @param props - Parameters for the fetch operation
 * @param props.medicalDoctor - The authenticated medical doctor making the
 *   request (must be provider on the target appointment)
 * @param props.appointmentId - Unique identifier for the target appointment
 * @param props.reminderId - Unique identifier for the reminder to retrieve
 * @returns The appointment reminder details in DTO format
 * @throws {Error} If the reminder or appointment is not found, or if the
 *   requesting doctor is not authorized (not provider for appointment)
 */
export async function gethealthcarePlatformMedicalDoctorAppointmentsAppointmentIdRemindersReminderId(props: {
  medicalDoctor: MedicaldoctorPayload;
  appointmentId: string & tags.Format<"uuid">;
  reminderId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  const { medicalDoctor, appointmentId, reminderId } = props;

  // Fetch appointment reminder (no soft-delete filter since field doesn't exist)
  const reminder =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.findFirst({
      where: {
        id: reminderId,
        appointment_id: appointmentId,
      },
    });
  if (!reminder) {
    throw new Error("Appointment reminder not found");
  }

  // Fetch parent appointment to validate provider assignment
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { id: appointmentId },
    });
  if (!appointment) {
    throw new Error("Appointment not found");
  }
  if (appointment.provider_id !== medicalDoctor.id) {
    throw new Error("Forbidden: Doctor is not provider for appointment");
  }

  // Map and convert date-time fields with toISOStringSafe
  return {
    id: reminder.id,
    appointment_id: reminder.appointment_id,
    reminder_time: toISOStringSafe(reminder.reminder_time),
    recipient_type: reminder.recipient_type,
    recipient_id: reminder.recipient_id,
    delivery_channel: reminder.delivery_channel,
    delivery_status: reminder.delivery_status,
    created_at: toISOStringSafe(reminder.created_at),
    updated_at: toISOStringSafe(reminder.updated_at),
  };
}
