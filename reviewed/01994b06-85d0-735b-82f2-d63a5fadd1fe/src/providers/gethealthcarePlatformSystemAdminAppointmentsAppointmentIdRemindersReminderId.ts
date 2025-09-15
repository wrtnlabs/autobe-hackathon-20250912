import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get a specific appointment reminder by ID for review or audit.
 *
 * This operation retrieves the details of a specific reminder associated with
 * the given appointment in the healthcare scheduling system. It enforces strict
 * organizational and appointment-based access control as handled by the
 * systemadmin authentication decorator. Only reminders that exist and match the
 * criteria are returned.
 *
 * @param props - Object containing:
 *
 *   - SystemAdmin: The authorized SystemadminPayload
 *   - AppointmentId: ID of the relevant appointment (UUID)
 *   - ReminderId: ID of the reminder (UUID)
 *
 * @returns The appointment reminder entity, including all notification/delivery
 *   metadata
 * @throws {Error} If the appointment reminder does not exist or does not match
 *   the appointmentId
 */
export async function gethealthcarePlatformSystemAdminAppointmentsAppointmentIdRemindersReminderId(props: {
  systemAdmin: SystemadminPayload;
  appointmentId: string & tags.Format<"uuid">;
  reminderId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  const { appointmentId, reminderId } = props;

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

  // Map all fields, convert all DateTime -> string & tags.Format<'date-time'>
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
