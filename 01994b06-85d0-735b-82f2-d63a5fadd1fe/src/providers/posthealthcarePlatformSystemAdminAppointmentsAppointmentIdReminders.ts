import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Schedule a new reminder for an appointment
 * (healthcare_platform_appointment_reminders).
 *
 * Registers a future reminder notification for an appointment, ensuring the
 * parent appointment exists and is not cancelled, duplicate reminders are
 * prevented, and request timing is valid. Only accessible by a Systemadmin.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system administrator
 * @param props.appointmentId - UUID of the appointment for the reminder
 * @param props.body - Reminder details (reminder_time, recipient_type, etc)
 * @returns The created appointment reminder entity
 * @throws {Error} When appointment is not found, is cancelled, reminder is
 *   duplicate, or reminder time is in the past
 */
export async function posthealthcarePlatformSystemAdminAppointmentsAppointmentIdReminders(props: {
  systemAdmin: SystemadminPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentReminder.ICreate;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  const { systemAdmin, appointmentId, body } = props;

  // Lookup appointment and status
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findUnique({
      where: { id: appointmentId },
      include: { status: true },
    });
  if (!appointment) throw new Error("Appointment not found");
  if (
    typeof appointment.status?.status_code === "string" &&
    appointment.status.status_code.trim().toLowerCase().startsWith("cancel")
  ) {
    throw new Error("Cannot add reminder to cancelled appointment");
  }

  // Enforce uniqueness (no duplicate reminders for same tuple)
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.findFirst({
      where: {
        appointment_id: appointmentId,
        recipient_type: body.recipient_type,
        recipient_id: body.recipient_id,
        reminder_time: body.reminder_time,
      },
    });
  if (duplicate) {
    throw new Error(
      "Duplicate reminder exists for this appointment/recipient/time",
    );
  }

  // Validate reminder_time is in the future
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  if (body.reminder_time < now) {
    throw new Error("Reminder time cannot be in the past");
  }

  // Create reminder
  const created =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        appointment_id: appointmentId,
        reminder_time: body.reminder_time,
        recipient_type: body.recipient_type,
        recipient_id: body.recipient_id,
        delivery_channel: body.delivery_channel,
        delivery_status: "pending",
        created_at: now,
        updated_at: now,
      },
    });

  // Return mapped entity, converting all dates with toISOStringSafe.
  return {
    id: created.id,
    appointment_id: created.appointment_id,
    reminder_time: toISOStringSafe(created.reminder_time),
    recipient_type: created.recipient_type,
    recipient_id: created.recipient_id,
    delivery_channel: created.delivery_channel,
    delivery_status: created.delivery_status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
