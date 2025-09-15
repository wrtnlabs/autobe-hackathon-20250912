import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Schedule a new reminder for an appointment
 * (healthcare_platform_appointment_reminders).
 *
 * Registers a new reminder notification for a given appointment, to be
 * delivered via a specified channel (SMS, email, etc.) to an eligible recipient
 * prior to the appointment time. Ensures only authorized clinical staff can
 * schedule reminders, and validates appointment, recipient, and timing. All
 * reminder creations are auditable and immutable.
 *
 * @param props - Object containing properties for nurse authentication, target
 *   appointment, and reminder details
 * @param props.nurse - Authenticated nurse payload used for permission checks
 * @param props.appointmentId - UUID of the appointment for which the reminder
 *   is scheduled
 * @param props.body - Payload containing timing, recipient, and delivery
 *   channel
 * @returns The created appointment reminder entity, including all relevant
 *   scheduling and delivery fields
 * @throws {Error} If appointment is not found or deleted
 * @throws {Error} If recipient is not valid for this appointment
 * @throws {Error} If reminder time is not in the future
 * @throws {Error} If recipient_type is not supported
 */
export async function posthealthcarePlatformNurseAppointmentsAppointmentIdReminders(props: {
  nurse: NursePayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentReminder.ICreate;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  const { nurse, appointmentId, body } = props;

  // Step 1: Validate appointment existence and not deleted
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findUnique({
      where: { id: appointmentId, deleted_at: null },
      select: { id: true, patient_id: true },
    });
  if (!appointment) {
    throw new Error("Appointment not found or has been deleted");
  }

  // Step 2: Validate recipient type and match to appointment
  if (body.recipient_type !== "patient") {
    throw new Error("Currently only 'patient' recipient_type is supported");
  }
  if (body.recipient_id !== appointment.patient_id) {
    throw new Error("recipient_id must match the appointment's patient");
  }

  // Step 3: Validate that reminder time is in the future
  const nowTs = Date.now();
  if (new Date(body.reminder_time).getTime() <= nowTs) {
    throw new Error("reminder_time must be in the future");
  }

  // Step 4: Prepare fields for creation
  const now = toISOStringSafe(new Date());
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

  // Step 5: Return as immutable object, fully conforming to DTO
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
