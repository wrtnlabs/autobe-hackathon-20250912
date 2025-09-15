import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Schedule a new reminder for an appointment
 * (healthcare_platform_appointment_reminders).
 *
 * Registers a reminder notification entity for a specific appointment,
 * validating business, participant, and timing constraints and creating a new
 * reminder record to be delivered by the notification system. Only department
 * head users may schedule reminders, and all operations are validated for
 * compliance.
 *
 * - Verifies the appointment exists and is not cancelled
 * - Ensures the reminder recipient is a participant (patient or provider) of the
 *   appointment
 * - Confirms the reminder time is scheduled for the future and before appointment
 *   start
 * - Creates a new reminder record, initializing delivery status to 'pending'
 *
 * @param props - Request properties
 * @param props.departmentHead - The authenticated department head user
 *   performing the operation
 * @param props.appointmentId - Unique identifier for the appointment
 * @param props.body - Details for the new reminder (recipient info, delivery
 *   channel, reminder time)
 * @returns The new appointment reminder entity
 * @throws {Error} If appointment does not exist, is cancelled, recipient is
 *   invalid, or timing is incorrect.
 */
export async function posthealthcarePlatformDepartmentHeadAppointmentsAppointmentIdReminders(props: {
  departmentHead: DepartmentheadPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentReminder.ICreate;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Fetch the parent appointment, ensure not cancelled
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findUnique({
      where: { id: props.appointmentId },
      select: {
        id: true,
        patient_id: true,
        provider_id: true,
        status_id: true,
        start_time: true,
      },
    });
  if (!appointment) {
    throw new Error("Appointment does not exist");
  }
  // Fetch appointment status to check for 'cancelled'
  const status =
    await MyGlobal.prisma.healthcare_platform_appointment_statuses.findUnique({
      where: { id: appointment.status_id },
      select: { status_code: true },
    });
  if (!status || status.status_code === "cancelled") {
    throw new Error("Appointment is cancelled");
  }
  // Validate recipient_id must be provider or patient
  if (
    props.body.recipient_id !== appointment.patient_id &&
    props.body.recipient_id !== appointment.provider_id
  ) {
    throw new Error("Recipient must be a participant in the appointment");
  }
  // Validate reminder_time > now and < appointment.start_time
  if (
    props.body.reminder_time <= now ||
    props.body.reminder_time >= toISOStringSafe(appointment.start_time)
  ) {
    throw new Error(
      "Reminder must be scheduled between now and appointment start time",
    );
  }
  const created =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.create({
      data: {
        id: v4(),
        appointment_id: props.appointmentId,
        reminder_time: props.body.reminder_time,
        recipient_type: props.body.recipient_type,
        recipient_id: props.body.recipient_id,
        delivery_channel: props.body.delivery_channel,
        delivery_status: "pending",
        created_at: now,
        updated_at: now,
      },
    });
  return {
    id: created.id,
    appointment_id: created.appointment_id,
    reminder_time: created.reminder_time,
    recipient_type: created.recipient_type,
    recipient_id: created.recipient_id,
    delivery_channel: created.delivery_channel,
    delivery_status: created.delivery_status,
    created_at: created.created_at,
    updated_at: created.updated_at,
  };
}
