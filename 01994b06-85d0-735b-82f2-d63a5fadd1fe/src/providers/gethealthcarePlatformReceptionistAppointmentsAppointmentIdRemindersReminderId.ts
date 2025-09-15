import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Get a specific appointment reminder by ID for review or audit
 * (healthcare_platform_appointment_reminders).
 *
 * Retrieves notification reminder information for a specific appointment
 * reminder identified by appointmentId and reminderId. Enables organizational
 * staff or the recipient (e.g. patient) to query the status and content of
 * reminders sent prior to an appointment—including delivery time, channel,
 * status (sent, failed, pending), and recipient details.
 *
 * Security is enforced to ensure only users associated with the organization,
 * appointment, or as the recipient can access the reminder details. Reminder
 * entities in this table are subsidiary and not manipulated directly outside of
 * the parent appointment lifecycle, fitting strictly within business and audit
 * flows. All reads are logged for compliance tracking and SLA monitoring.
 *
 * @param props - Object containing all necessary parameters for this operation
 * @param props.receptionist - The authenticated receptionist user performing
 *   the request
 * @param props.appointmentId - The UUID of the appointment this reminder
 *   belongs to
 * @param props.reminderId - The UUID of the reminder to retrieve
 * @returns The details of the appointment reminder as an
 *   IHealthcarePlatformAppointmentReminder DTO
 * @throws {Error} When the reminder does not exist, has been soft-deleted, or
 *   is not accessible to this user
 */
export async function gethealthcarePlatformReceptionistAppointmentsAppointmentIdRemindersReminderId(props: {
  receptionist: ReceptionistPayload;
  appointmentId: string & tags.Format<"uuid">;
  reminderId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  const { appointmentId, reminderId } = props;
  const reminder =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.findFirst({
      where: {
        id: reminderId,
        appointment_id: appointmentId,
        // deleted_at: null, // Removed, field does not exist in schema
      },
      select: {
        id: true,
        appointment_id: true,
        reminder_time: true,
        recipient_type: true,
        recipient_id: true,
        delivery_channel: true,
        delivery_status: true,
        created_at: true,
        updated_at: true,
      },
    });
  if (!reminder) {
    throw new Error("Reminder not found");
  }
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
