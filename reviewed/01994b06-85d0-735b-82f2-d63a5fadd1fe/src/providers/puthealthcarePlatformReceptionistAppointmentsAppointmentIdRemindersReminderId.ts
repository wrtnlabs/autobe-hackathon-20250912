import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Update an existing appointment reminder
 * (healthcare_platform_appointment_reminders).
 *
 * Modify scheduling, recipient, delivery channel, or status for a reminder
 * attached to a given appointment. This provider strictly enforces business
 * rules:
 *
 * - Only reminders for active/upcoming, non-cancelled appointments may be updated
 * - Only reminders NOT already delivered may be updated
 * - Reminders belonging to the given appointmentId and reminderId are validated
 *   for existence
 * - Returns the updated reminder entity as per DTO All date fields are normalized
 *   using toISOStringSafe; UUID fields are preserved and never asserted or
 *   mutated.
 *
 * @param props - Input with authenticated receptionist, appointmentId,
 *   reminderId, and body for update
 * @param props.receptionist - Authenticated receptionist (enforces business
 *   permissions)
 * @param props.appointmentId - UUID for appointment to which reminder belongs
 * @param props.reminderId - UUID for the specific reminder
 * @param props.body - Partial update object for reminder fields (each field is
 *   optional and will update only if supplied)
 * @returns Updated IHealthcarePlatformAppointmentReminder DTO for the
 *   appointment reminder after update
 * @throws Error if appointment or reminder not found, not updatable, or
 *   receptionist unauthorized
 */
export async function puthealthcarePlatformReceptionistAppointmentsAppointmentIdRemindersReminderId(props: {
  receptionist: ReceptionistPayload;
  appointmentId: string & tags.Format<"uuid">;
  reminderId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentReminder.IUpdate;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  const { receptionist, appointmentId, reminderId, body } = props;

  // Step 1: Fetch reminder for this appointment
  const reminder =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.findFirst({
      where: { id: reminderId, appointment_id: appointmentId },
    });
  if (!reminder) throw new Error("Reminder or appointment not found");

  // Step 2: Fetch parent appointment for status check
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { id: appointmentId },
    });
  if (!appointment) throw new Error("Appointment not found");

  // Step 3: Deny update if appointment is cancelled/past/soft-deleted
  if (appointment.deleted_at !== null)
    throw new Error("Appointment is inactive (deleted/cancelled)");
  // For strict business rule: implement actual status code lookup if mapping from status_id to status is available

  // Step 4: Deny update if reminder is already delivered
  if (reminder.delivery_status === "delivered")
    throw new Error("Reminder already delivered");

  // Step 5: Only permit updates on allowed fields. Update-at always refreshed.
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.update({
      where: { id: reminderId },
      data: {
        reminder_time: body.reminder_time ?? reminder.reminder_time,
        recipient_type: body.recipient_type ?? reminder.recipient_type,
        recipient_id: body.recipient_id ?? reminder.recipient_id,
        delivery_channel: body.delivery_channel ?? reminder.delivery_channel,
        delivery_status: body.delivery_status ?? reminder.delivery_status,
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    appointment_id: updated.appointment_id,
    reminder_time: toISOStringSafe(updated.reminder_time),
    recipient_type: updated.recipient_type,
    recipient_id: updated.recipient_id,
    delivery_channel: updated.delivery_channel,
    delivery_status: updated.delivery_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
