import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Schedule a new reminder for an appointment
 * (healthcare_platform_appointment_reminders).
 *
 * Registers a new reminder notification entity for a specific appointment,
 * including scheduling and recipient details. Validates appointment existence
 * and status, recipient participation, and reminder timing. Only authenticated
 * receptionists may call this; audit trail is enforced automatically.
 *
 * @param props - Request parameters
 * @param props.receptionist - Authenticated receptionist performing this
 *   operation
 * @param props.appointmentId - The UUID of the appointment for which the
 *   reminder is being created
 * @param props.body - Payload for the new reminder (reminder_time,
 *   recipient_type, recipient_id, delivery_channel)
 * @returns The created appointment reminder as
 *   IHealthcarePlatformAppointmentReminder
 * @throws {Error} If appointment is not found, is deleted, recipient is
 *   invalid, or reminder_time is not valid
 */
export async function posthealthcarePlatformReceptionistAppointmentsAppointmentIdReminders(props: {
  receptionist: ReceptionistPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentReminder.ICreate;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Fetch appointment and validate active
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: props.appointmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        patient_id: true,
        provider_id: true,
        start_time: true,
        deleted_at: true,
      },
    });
  if (!appointment) {
    throw new Error("Appointment not found or is deleted");
  }
  // Validate recipient_id
  if (
    props.body.recipient_id !== appointment.patient_id &&
    props.body.recipient_id !== appointment.provider_id
  ) {
    throw new Error(
      "Recipient must be participant in this appointment (patient or provider)",
    );
  }
  // Validate timing: reminder_time must be in the future and before appointment.start_time
  if (props.body.reminder_time <= now) {
    throw new Error("reminder_time must be in the future");
  }
  const appointmentStart: string & tags.Format<"date-time"> = toISOStringSafe(
    appointment.start_time,
  );
  if (props.body.reminder_time >= appointmentStart) {
    throw new Error("reminder_time must be before appointment start_time");
  }
  // Create the reminder
  const reminder =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
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
  // Return all fields as required by DTO; dates are strings
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
