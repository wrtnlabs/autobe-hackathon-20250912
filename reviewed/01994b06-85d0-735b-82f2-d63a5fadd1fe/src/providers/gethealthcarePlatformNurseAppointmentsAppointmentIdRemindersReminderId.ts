import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Get a specific appointment reminder by ID for review or audit
 * (healthcare_platform_appointment_reminders).
 *
 * This operation fetches the details of a specific reminder associated with a
 * given appointment in the healthcare scheduling system. Only nurses who are
 * listed as the provider for the appointment may access the reminder details.
 *
 * @param props - The request properties
 * @param props.nurse - The authenticated nurse payload performing this request
 * @param props.appointmentId - The UUID of the appointment
 * @param props.reminderId - The UUID of the reminder to retrieve
 * @returns The full details for the appointment reminder, including timing,
 *   recipient, channel, and delivery status
 * @throws {Error} If the reminder is not found, the appointment does not exist,
 *   or the nurse is not the provider for the appointment
 */
export async function gethealthcarePlatformNurseAppointmentsAppointmentIdRemindersReminderId(props: {
  nurse: NursePayload;
  appointmentId: string & tags.Format<"uuid">;
  reminderId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  const { nurse, appointmentId, reminderId } = props;

  // Step 1: Retrieve the reminder if it exists (ignore deleted_at - not in where)
  const reminder =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.findFirst({
      where: {
        id: reminderId,
        appointment_id: appointmentId,
        // deleted_at: null,  // <--- REMOVED as per schema error (doesn't exist)
      },
    });
  if (!reminder) {
    throw new Error("Reminder not found");
  }

  // Step 2: Make sure the appointment exists
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: appointmentId,
      },
    });
  if (!appointment) {
    throw new Error("Appointment not found");
  }

  // Step 3: Authorization - nurse must be provider on this appointment
  if (appointment.provider_id !== nurse.id) {
    throw new Error("Forbidden: nurse does not have access to this reminder");
  }

  // Step 4: Return mapped DTO with strict date conversion
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
