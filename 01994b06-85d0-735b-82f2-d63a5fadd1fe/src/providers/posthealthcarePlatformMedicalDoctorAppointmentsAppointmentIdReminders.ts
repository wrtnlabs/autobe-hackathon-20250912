import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Schedule a new reminder for an appointment
 * (healthcare_platform_appointment_reminders).
 *
 * Registers a new scheduled notification/reminder entity for a specific
 * appointment, to be delivered before the appointment via specified channel and
 * recipient.
 *
 * Ensures the appointment exists and the acting doctor is authorized (assigned
 * provider), validates that recipient is an active participant in the
 * appointment (either provider or patient), and ensures reminder timing is
 * before the appointment start time. Timestamps and UUIDs are generated
 * according to system and DTO conventions. Delivery status is set to 'pending'
 * on creation.
 *
 * @param props - Request properties
 * @param props.medicalDoctor - The authenticated medical doctor (must be
 *   assigned as provider on the appointment)
 * @param props.appointmentId - The appointment associated with the reminder
 *   (UUID)
 * @param props.body - Reminder creation data (recipient, channel, time)
 * @returns The newly created appointment reminder entity
 * @throws {Error} When the appointment does not exist, is deleted, cancelled,
 *   provider mismatch, recipient invalid, or invalid scheduling
 */
export async function posthealthcarePlatformMedicalDoctorAppointmentsAppointmentIdReminders(props: {
  medicalDoctor: MedicaldoctorPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentReminder.ICreate;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  const { medicalDoctor, appointmentId, body } = props;
  // Step 1: Fetch the appointment and verify permissions/business context
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: appointmentId,
        provider_id: medicalDoctor.id,
        deleted_at: null,
      },
    });
  if (!appointment) {
    throw new Error(
      "Appointment not found, deleted, or you are not the assigned provider",
    );
  }

  // Step 2: Validate recipient is participant in appointment
  const validRecipients = [appointment.provider_id, appointment.patient_id];
  if (
    body.recipient_id !== appointment.provider_id &&
    body.recipient_id !== appointment.patient_id
  ) {
    throw new Error("Recipient is not a participant in this appointment");
  }
  if (body.recipient_type !== "provider" && body.recipient_type !== "patient") {
    throw new Error("recipient_type must be 'provider' or 'patient'");
  }

  // Step 3: Validate scheduling constraint
  // Reminder time must be before appointment start_time and in the future
  if (body.reminder_time >= appointment.start_time) {
    throw new Error("Reminder time must be before the appointment start time");
  }
  if (body.reminder_time <= toISOStringSafe(new Date())) {
    throw new Error("Cannot schedule reminder in the past");
  }

  // Step 4: Save reminder with all required fields and consistent timestamping
  const now = toISOStringSafe(new Date());
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

  // Step 5: Map DB result to API DTO structure (no Date type)
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
