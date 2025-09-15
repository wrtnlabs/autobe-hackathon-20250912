import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Update an existing appointment reminder
 * (healthcare_platform_appointment_reminders).
 *
 * This operation allows an authenticated medical doctor to modify the
 * scheduling or delivery configuration of a specific reminder attached to an
 * appointment, such as rescheduling delivery, updating the recipient, or
 * changing channel or delivery status. The appointment and reminder are
 * strictly validated:
 *
 * - The appointment must not be cancelled, deleted (soft-deleted), or in the past
 *   (end time must be >= now).
 * - The reminder must exist, reference the same appointment, must not already be
 *   delivered, sent, expired, or failed.
 * - Only supplied fields in the body are updated, and only known schema fields
 *   are allowed.
 * - All updates are strictly date-format safe — no native Date type is used in
 *   any return type.
 * - On success, the updated reminder is returned in DTO format, with all
 *   date/datetime fields as string & tags.Format<'date-time'>.
 *
 * @param props - The props containing medicalDoctor (authenticated),
 *   appointmentId, reminderId, and update body
 * @returns The updated reminder entity with date fields as string &
 *   tags.Format<'date-time'>
 * @throws {Error} If appointment or reminder are not found, or validation fails
 *   per business/compliance rules
 */
export async function puthealthcarePlatformMedicalDoctorAppointmentsAppointmentIdRemindersReminderId(props: {
  medicalDoctor: MedicaldoctorPayload;
  appointmentId: string & tags.Format<"uuid">;
  reminderId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentReminder.IUpdate;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  const { appointmentId, reminderId, body } = props;

  // Step 1: Find appointment; must not be deleted or cancelled or in the past
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: appointmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        end_time: true,
        status_id: true,
      },
    });
  if (!appointment) throw new Error("Appointment not found or deleted");

  // Status: must not be cancelled
  const status =
    await MyGlobal.prisma.healthcare_platform_appointment_statuses.findFirst({
      where: { id: appointment.status_id },
      select: { status_code: true },
    });
  if (!status) throw new Error("Appointment status not found");
  if (status.status_code === "cancelled")
    throw new Error("Cannot update reminder for cancelled appointment");

  // Time: must not be in the past
  const nowString = toISOStringSafe(new Date());
  if (toISOStringSafe(appointment.end_time) < nowString)
    throw new Error("Cannot update reminder for past appointment");

  // Step 2: Get the reminder
  const reminder =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.findFirst({
      where: {
        id: reminderId,
        appointment_id: appointmentId,
      },
    });
  if (!reminder) throw new Error("Reminder not found");
  if (
    ["sent", "delivered", "expired", "failed"].includes(
      reminder.delivery_status,
    )
  )
    throw new Error("Reminder already processed and cannot be updated");

  // Step 3: Prepare update object: only include provided fields, never Date type
  const updateData: {
    reminder_time?: string & tags.Format<"date-time">;
    recipient_type?: string;
    recipient_id?: string & tags.Format<"uuid">;
    delivery_channel?: string;
    delivery_status?: string;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (body.reminder_time !== undefined)
    updateData.reminder_time = body.reminder_time;
  if (body.recipient_type !== undefined)
    updateData.recipient_type = body.recipient_type;
  if (body.recipient_id !== undefined)
    updateData.recipient_id = body.recipient_id;
  if (body.delivery_channel !== undefined)
    updateData.delivery_channel = body.delivery_channel;
  if (body.delivery_status !== undefined)
    updateData.delivery_status = body.delivery_status;

  // Step 4: Update
  const updated =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.update({
      where: { id: reminderId },
      data: updateData,
    });

  // Step 5: Convert all dates to string & tags.Format<'date-time'> before returning
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
