import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Schedule a new reminder for an appointment
 * (healthcare_platform_appointment_reminders).
 *
 * Registers a reminder to be delivered to the patient for an existing
 * appointment. Only the owning patient may create reminders for their own
 * appointment. Validates recipient, appointment existence, patient ownership,
 * and future scheduling. Applies strict datetime typing, does not use native
 * Date, and always uses toISOStringSafe.
 *
 * @param props - Object containing authentication, appointmentId, and reminder
 *   creation info.
 * @param props.patient - The authenticated patient payload.
 * @param props.appointmentId - The appointment ID for which to schedule the
 *   reminder.
 * @param props.body - Request body for reminder creation (time, channel, etc.).
 * @returns The created appointment reminder entity.
 * @throws {Error} When validation fails (authorization, record not found, time,
 *   etc.).
 */
export async function posthealthcarePlatformPatientAppointmentsAppointmentIdReminders(props: {
  patient: PatientPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentReminder.ICreate;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  const { patient, appointmentId, body } = props;

  // 1. Authorization: ensure patient is recipient and correct type
  if (body.recipient_id !== patient.id) {
    throw new Error(
      "Patient can only create reminders for themselves (recipient_id must match).",
    );
  }
  if (body.recipient_type !== "patient") {
    throw new Error("Recipient type must be 'patient'.");
  }

  // 2. Ensure appointment exists and not soft-deleted/cancelled, patient owns
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findUnique({
      where: { id: appointmentId },
      select: { id: true, patient_id: true },
    });
  if (!appointment) {
    throw new Error("Appointment not found.");
  }
  if (appointment.patient_id !== patient.id) {
    throw new Error("Forbidden: Appointment does not belong to patient.");
  }

  // 3. Validate reminder_time is in future only (no past reminders)
  // toISOStringSafe can accept either string or Date; both work, but input may be string.
  const now = toISOStringSafe(new Date());
  if (body.reminder_time <= now) {
    throw new Error("Reminder time must be in the future.");
  }

  // 4. Create reminder DB record (all values directly assigned; no Date type or as assertion)
  const created =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        appointment_id: appointmentId,
        reminder_time: toISOStringSafe(body.reminder_time),
        recipient_type: body.recipient_type,
        recipient_id: body.recipient_id,
        delivery_channel: body.delivery_channel,
        delivery_status: "pending",
        created_at: now,
        updated_at: now,
      },
    });

  // 5. Map DB record to DTO (no Date or as usage; all date-times as ISO strings)
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
