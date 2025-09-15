import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing appointment reminder
 * (healthcare_platform_appointment_reminders).
 *
 * Modifies scheduling, recipient, or delivery parameters for an existing
 * appointment reminder entity.
 *
 * Only reminders that have not yet been delivered (statuses other than 'sent',
 * 'delivered', 'expired', 'acknowledged') and for future, not-cancelled
 * appointments may be updated. Authorization: systemAdmin is required—handled
 * by the decorator.
 *
 * Throws 404 if reminder or appointment is not found. Throws 405 for attempts
 * to update reminders already delivered, for past/cancelled/deleted
 * appointments, or invalid update attempts.
 *
 * @param props - Parameters required for updating an appointment reminder
 * @param props.systemAdmin - Authenticated SystemadminPayload representing a
 *   system admin
 * @param props.appointmentId - UUID for the parent appointment
 * @param props.reminderId - UUID for the target appointment reminder
 * @param props.body - Update payload (fields to update)
 * @returns The updated IHealthcarePlatformAppointmentReminder DTO with all
 *   fields formatted as required
 * @throws {Error} If the reminder or appointment is not found, is not updatable
 *   (delivered/expired), or appointment is cancelled, deleted, or in the past
 */
export async function puthealthcarePlatformSystemAdminAppointmentsAppointmentIdRemindersReminderId(props: {
  systemAdmin: SystemadminPayload;
  appointmentId: string & tags.Format<"uuid">;
  reminderId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentReminder.IUpdate;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  const { appointmentId, reminderId, body } = props;

  // Step 1: Lookup the reminder by its id/appointment_id
  const reminder =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.findFirst({
      where: { id: reminderId, appointment_id: appointmentId },
    });
  if (!reminder) {
    throw new Error("Reminder not found");
  }

  // Step 2: Lookup and validate the parent appointment (must not be deleted/cancelled/past)
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { id: appointmentId },
      select: { deleted_at: true, status: true, start_time: true },
    });
  if (!appointment) {
    throw new Error("Appointment not found");
  }
  if (appointment.deleted_at !== null) {
    throw new Error("Appointment has been deleted");
  }
  if (appointment.status === "cancelled") {
    throw new Error("Cannot update reminder for a cancelled appointment");
  }
  const now = toISOStringSafe(new Date());
  if (appointment.start_time < now) {
    throw new Error("Cannot update reminder for a past appointment");
  }

  // Step 3: Disallow update if reminder is already sent/delivered/expired/acknowledged
  const uneditableStatuses = ["sent", "delivered", "expired", "acknowledged"];
  if (uneditableStatuses.includes(reminder.delivery_status)) {
    throw new Error(
      "Cannot update a reminder that has already been sent, delivered, acknowledged or expired",
    );
  }

  // Step 4: Apply update only to supplied fields + updated_at
  const updated =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.update({
      where: { id: reminderId, appointment_id: appointmentId },
      data: {
        reminder_time: body.reminder_time ?? undefined,
        recipient_type: body.recipient_type ?? undefined,
        recipient_id: body.recipient_id ?? undefined,
        delivery_channel: body.delivery_channel ?? undefined,
        delivery_status: body.delivery_status ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Step 5: Return DTO, ensuring all date fields are ISO formatted/branded
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
