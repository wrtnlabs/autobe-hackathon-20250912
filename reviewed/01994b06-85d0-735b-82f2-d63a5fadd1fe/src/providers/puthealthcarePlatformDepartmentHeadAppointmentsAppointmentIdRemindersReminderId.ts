import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Update an existing appointment reminder
 * (healthcare_platform_appointment_reminders).
 *
 * This operation updates an existing reminder notification entity for an
 * appointment—such as rescheduling a reminder, changing recipient/channel, or
 * modifying the content prior to its dispatch. It enforces business rules:
 * cannot update reminders for cancelled, deleted, past, or sent/delivered
 * reminders. All modifications are performed atomically, and updated fields are
 * returned as an IHealthcarePlatformAppointmentReminder, with strict ISO string
 * handling for all date fields. Audit trail and permission enforcement are
 * handled by system conventions.
 *
 * @param props - The update payload including authenticated departmentHead,
 *   appointmentId, reminderId, and update fields.
 * @returns The updated reminder entity reflecting all accepted changes.
 * @throws {Error} If the reminder or parent appointment is not found, if the
 *   reminder is already delivered, if the appointment is cancelled, deleted, or
 *   in the past.
 */
export async function puthealthcarePlatformDepartmentHeadAppointmentsAppointmentIdRemindersReminderId(props: {
  departmentHead: DepartmentheadPayload;
  appointmentId: string & tags.Format<"uuid">;
  reminderId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentReminder.IUpdate;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  // Find the reminder for this appointment, check that it is editable
  const reminder =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.findFirst({
      where: { id: props.reminderId, appointment_id: props.appointmentId },
    });
  if (!reminder) throw new Error("Reminder not found for this appointment");
  if (reminder.delivery_status === "sent") {
    throw new Error(
      "Reminder has already been delivered and cannot be updated",
    );
  }

  // Find the appointment by appointmentId, forbid update if deleted or in the past
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { id: props.appointmentId },
    });
  if (!appointment) throw new Error("Appointment not found");
  if (appointment.deleted_at !== null) {
    throw new Error("Cannot update reminder for a deleted appointment");
  }
  // Cannot update if appointment is completed (end_time < now)
  const now = toISOStringSafe(new Date());
  if (appointment.end_time < now) {
    throw new Error("Cannot update reminder for an appointment in the past");
  }

  // Find appointment status to ensure not cancelled
  const status =
    await MyGlobal.prisma.healthcare_platform_appointment_statuses.findFirst({
      where: { id: appointment.status_id },
    });
  if (!status) throw new Error("Appointment status not found");
  if (status.status_code === "cancelled") {
    throw new Error("Cannot update reminder for cancelled appointment");
  }

  // Only update supplied fields; updated_at is always written to now
  const updated =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.update({
      where: { id: props.reminderId },
      data: {
        reminder_time: props.body.reminder_time ?? undefined,
        recipient_type: props.body.recipient_type ?? undefined,
        recipient_id: props.body.recipient_id ?? undefined,
        delivery_channel: props.body.delivery_channel ?? undefined,
        delivery_status: props.body.delivery_status ?? undefined,
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
