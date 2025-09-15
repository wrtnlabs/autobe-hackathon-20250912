import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Schedule a new reminder for an appointment
 * (healthcare_platform_appointment_reminders).
 *
 * Registers a reminder entity to trigger prior to a specific appointment,
 * strictly enforcing role, recipient, timing, and scheduling constraints: Only
 * valid for providers/patients attached to the appointment, timing must be in
 * the future, before appointment start, and with enough lead time.
 *
 * @param props - Technician session, appointment id, body: reminder creation
 *   DTO
 * @param props.technician - Authenticated technician making the request
 * @param props.appointmentId - Target appointment UUID
 * @param props.body - Reminder creation payload (recipient details, schedule,
 *   channel)
 * @returns The newly created reminder entity (strictly matching API DTO)
 * @throws {Error} If appointment is not found, recipient is invalid, or timing
 *   fails validation
 */
export async function posthealthcarePlatformTechnicianAppointmentsAppointmentIdReminders(props: {
  technician: TechnicianPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentReminder.ICreate;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  const { technician, appointmentId, body } = props;

  // Generate current timestamp as strict ISO string for created_at/updated_at
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Fetch appointment and validate—must exist, not deleted
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { id: appointmentId, deleted_at: null },
    });
  if (!appointment) {
    throw new Error("Appointment not found");
  }

  // Validate recipient_id is either provider or patient referenced on appointment
  const isProvider = body.recipient_id === appointment.provider_id;
  const isPatient = body.recipient_id === appointment.patient_id;
  if (!isProvider && !isPatient) {
    throw new Error("Recipient is not assigned to appointment");
  }

  // Validate recipient_type matches the assignment
  if (body.recipient_type !== "provider" && body.recipient_type !== "patient") {
    throw new Error("recipient_type must be 'provider' or 'patient'");
  }
  if (
    (body.recipient_type === "provider" && !isProvider) ||
    (body.recipient_type === "patient" && !isPatient)
  ) {
    throw new Error("recipient_type and recipient_id mismatch");
  }

  // Validate reminder_time is in the future and before appointment start_time
  if (body.reminder_time <= now) {
    throw new Error("Reminders must be scheduled in the future");
  }
  if (body.reminder_time >= appointment.start_time) {
    throw new Error("Reminders must occur before appointment starts");
  }

  // Enforce minimal lead window (e.g., 5 minutes)
  const MIN_LEAD_MILLISECONDS = 5 * 60 * 1000;
  if (
    Number(new Date(appointment.start_time)) -
      Number(new Date(body.reminder_time)) <
    MIN_LEAD_MILLISECONDS
  ) {
    throw new Error(
      "Reminder not scheduled with enough lead time before appointment",
    );
  }

  // Create and insert reminder
  const created =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.create({
      data: {
        id: v4(),
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

  // Return strictly conforming DTO: all datetimes as ISO strings
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
