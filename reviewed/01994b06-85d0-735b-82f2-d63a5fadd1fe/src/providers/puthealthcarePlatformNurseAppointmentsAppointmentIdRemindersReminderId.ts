import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Update an existing appointment reminder
 * (healthcare_platform_appointment_reminders).
 *
 * Modifies delivery timing, recipient, channel, or status for a scheduled
 * notification attached to an appointment. Enforces business rules: may only
 * update reminders that are not yet delivered, not expired, and are not
 * attached to cancelled or deleted appointments. Nurse-level authentication is
 * required; all changes are audited by upstream logic. Only supplied fields in
 * the body are changed. Immutable, pure, and type-strict implementation.
 *
 * @param props - Request properties
 * @param props.nurse - Authenticated nurse making the request
 * @param props.appointmentId - Relevant appointment UUID
 * @param props.reminderId - Reminder UUID to update
 * @param props.body - Update payload (only supplied fields are patched)
 * @returns The updated reminder entity
 * @throws {Error} When reminder or appointment is missing, locked, delivered,
 *   or deleted
 */
export async function puthealthcarePlatformNurseAppointmentsAppointmentIdRemindersReminderId(props: {
  nurse: NursePayload;
  appointmentId: string & tags.Format<"uuid">;
  reminderId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentReminder.IUpdate;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  const { nurse, appointmentId, reminderId, body } = props;

  // 1. Locate active reminder for this appointmentId/reminderId
  const reminder =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.findFirst({
      where: {
        id: reminderId,
        appointment_id: appointmentId,
        // deleted_at: null, // Removed: does not exist in schema
      },
    });
  if (!reminder) {
    throw new Error("Reminder not found");
  }

  // 2. Check that the reminder is editable (not delivered, not expired, not acknowledged)
  const uneditableStatuses = ["sent", "delivered", "acknowledged", "expired"];
  if (uneditableStatuses.includes(reminder.delivery_status)) {
    throw new Error("Reminder already delivered or locked");
  }

  // 3. Fetch the parent appointment, ensure not cancelled/deleted/in past
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: appointmentId,
        deleted_at: null,
      },
    });
  if (!appointment) {
    throw new Error("Appointment not found or deleted");
  }

  // 4. Lookup the appointment status (cancelled = not editable)
  const appointmentStatus =
    await MyGlobal.prisma.healthcare_platform_appointment_statuses.findFirst({
      where: {
        id: appointment.status_id,
      },
    });
  if (!appointmentStatus) {
    throw new Error("Appointment status not found");
  }
  if (appointmentStatus.status_code.toLowerCase() === "cancelled") {
    throw new Error("Cannot edit reminder for cancelled appointment");
  }

  // 5. Optionally block updates if appointment is in the past
  // Use UTC date-time string for comparison (no native Date usage)
  // Only check if appointment.end_time < now: no further reminder allowed
  const nowIso: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  if (appointment.end_time && toISOStringSafe(appointment.end_time) < nowIso) {
    throw new Error("Cannot update reminder for an appointment in the past");
  }

  // 6. Build update object - only specified fields are changed
  const updateInput: {
    reminder_time?: string & tags.Format<"date-time">;
    recipient_type?: string;
    recipient_id?: string & tags.Format<"uuid">;
    delivery_channel?: string;
    delivery_status?: string;
    updated_at: string & tags.Format<"date-time">;
  } = {
    ...(body.reminder_time !== undefined && {
      reminder_time: body.reminder_time,
    }),
    ...(body.recipient_type !== undefined && {
      recipient_type: body.recipient_type,
    }),
    ...(body.recipient_id !== undefined && { recipient_id: body.recipient_id }),
    ...(body.delivery_channel !== undefined && {
      delivery_channel: body.delivery_channel,
    }),
    ...(body.delivery_status !== undefined && {
      delivery_status: body.delivery_status,
    }),
    updated_at: nowIso,
  };

  const updated =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.update({
      where: { id: reminderId },
      data: updateInput,
    });

  // 7. Compose API response, enforce precise types/format (no type assertion, all date fields converted)
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
