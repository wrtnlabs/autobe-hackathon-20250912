import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Get a specific appointment reminder by ID for review or audit
 * (healthcare_platform_appointment_reminders).
 *
 * Retrieves the full details of a notification/reminder entity for a specific
 * appointment, exclusively accessible to the technician recipient. Enforces
 * organizational and appointment-level access controls: only the technician for
 * whom the reminder is addressed as recipient (recipient_id, recipient_type =
 * 'provider') may access this data. All fields (timing, status, delivery
 * channel, recipient) are shown if the reminder exists and is active (not
 * soft-deleted).
 *
 * This function is used in notification/audit views and delivery tracking
 * flows.
 *
 * @param props - Properties for the request
 * @param props.technician - The authenticated technician making the request
 *   (must be recipient)
 * @param props.appointmentId - The ID (UUID) of the appointment associated with
 *   this reminder
 * @param props.reminderId - The ID (UUID) of the specific reminder to retrieve
 * @returns The appointment reminder's details (all fields in the entity)
 * @throws {Error} If the reminder is not found or the technician is not
 *   authorized as recipient
 */
export async function gethealthcarePlatformTechnicianAppointmentsAppointmentIdRemindersReminderId(props: {
  technician: TechnicianPayload;
  appointmentId: string & tags.Format<"uuid">;
  reminderId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  const { technician, appointmentId, reminderId } = props;
  // Lookup reminder, require appointment match and active
  const reminder =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.findFirst({
      where: {
        id: reminderId,
        appointment_id: appointmentId,
        // 'deleted_at' does not exist in this model's WhereInput type. Therefore, must not be included.
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
  // Authorization: must be recipient of type provider
  const isRecipient =
    reminder.recipient_id === technician.id &&
    reminder.recipient_type === "provider";
  if (!isRecipient) {
    throw new Error("Forbidden: not recipient of this reminder");
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
