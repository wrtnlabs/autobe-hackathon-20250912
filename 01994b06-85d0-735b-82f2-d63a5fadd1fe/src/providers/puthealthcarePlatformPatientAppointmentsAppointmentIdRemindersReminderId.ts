import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Update an existing appointment reminder
 * (healthcare_platform_appointment_reminders).
 *
 * Modifies the delivery_status for an appointment reminder owned by the patient
 * (only allowed field for patients). Enforces that only the delivery_status can
 * be edited by patients, validates ownership, reminder/appointment not already
 * delivered. Throws error on unauthorized field edits, status violations, or
 * business rule breaches. All returned values are of proper ISO-8601 branded
 * type.
 *
 * @param props - The update request properties including patient auth,
 *   appointmentId, reminderId, and update body
 * @param props.patient - The authenticated patient user
 * @param props.appointmentId - The appointment's UUID
 * @param props.reminderId - The reminder's UUID
 * @param props.body - Only delivery_status may be edited by patients
 * @returns The updated reminder entity with all fields revalidated and properly
 *   branded
 * @throws {Error} If reminder/appointment not found, ownership mismatch,
 *   already delivered, or forbidden field update attempted
 */
export async function puthealthcarePlatformPatientAppointmentsAppointmentIdRemindersReminderId(props: {
  patient: PatientPayload;
  appointmentId: string & tags.Format<"uuid">;
  reminderId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentReminder.IUpdate;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  const { patient, appointmentId, reminderId, body } = props;

  // 1. Fetch and validate the reminder
  const reminder =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.findFirst({
      where: {
        id: reminderId,
        appointment_id: appointmentId,
      },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        appointment_id: true,
        delivery_status: true,
        reminder_time: true,
        recipient_type: true,
        recipient_id: true,
        delivery_channel: true,
      },
    });
  if (reminder === null) throw new Error("Reminder does not exist (404)");
  if (reminder.recipient_id !== patient.id)
    throw new Error("Forbidden: This reminder does not belong to you (403)");

  // 2. Patients may only edit delivery_status
  if (
    typeof body.delivery_status === "undefined" ||
    Object.keys(body).length !== 1 ||
    !("delivery_status" in body)
  ) {
    throw new Error(
      "Only delivery_status may be updated by a patient (delivery_status must be the only supplied field)",
    );
  }

  // 3. Forbid update if reminder already delivered/sent
  if (reminder.delivery_status === "sent") {
    throw new Error("Reminder already delivered or acknowledged");
  }

  // 4. Fetch and validate the owning appointment is present and not deleted
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: appointmentId,
      },
      select: {
        patient_id: true,
      },
    });
  if (appointment === null)
    throw new Error(
      "Owning appointment does not exist, is deleted, or you do not have access (404)",
    );
  if (appointment.patient_id !== patient.id)
    throw new Error("Forbidden: This appointment does not belong to you (403)");

  // 5. Update ONLY delivery_status (patients cannot update anything else)
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.update({
      where: { id: reminderId },
      data: {
        delivery_status: body.delivery_status,
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
