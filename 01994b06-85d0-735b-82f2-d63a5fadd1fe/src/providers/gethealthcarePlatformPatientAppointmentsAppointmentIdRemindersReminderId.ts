import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Get a specific appointment reminder by ID for review or audit
 * (healthcare_platform_appointment_reminders).
 *
 * Retrieves notification/reminder information for a patient's specific
 * appointment reminder by appointmentId and reminderId. Allows a patient to
 * audit and view timing, delivery channel, recipient, and delivery status of
 * reminders sent for their appointment.
 *
 * Security: Only the recipient (patient) can access this reminder. Soft-deleted
 * reminders (deleted_at != null) are never returned. All access is checked and
 * any mismatch returns not found (no info leak).
 *
 * @param props - Props object
 * @param props.patient - Authenticated patient payload (must match recipient).
 * @param props.appointmentId - UUID of the parent appointment
 * @param props.reminderId - UUID of the reminder to fetch
 * @returns IHealthcarePlatformAppointmentReminder object
 * @throws {Error} If no reminder is found or user is not authorized to view it.
 */
export async function gethealthcarePlatformPatientAppointmentsAppointmentIdRemindersReminderId(props: {
  patient: PatientPayload;
  appointmentId: string & tags.Format<"uuid">;
  reminderId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  const { patient, appointmentId, reminderId } = props;
  const reminder =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.findFirst({
      where: {
        id: reminderId,
        appointment_id: appointmentId,
        recipient_id: patient.id,
      },
    });
  if (!reminder) throw new Error("Reminder not found");
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
