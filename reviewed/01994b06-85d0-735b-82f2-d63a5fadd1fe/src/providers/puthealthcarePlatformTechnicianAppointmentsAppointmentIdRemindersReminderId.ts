import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Update an existing appointment reminder
 * (healthcare_platform_appointment_reminders).
 *
 * This function allows an authenticated technician to update a scheduled
 * reminder notification for an appointment. The operation supports rescheduling
 * the reminder, modifying the recipient, changing the delivery channel, or
 * updating the delivery status. Critical business rules are enforced to prevent
 * editing reminders for delivered/cancelled/deleted appointments or
 * already-delivered reminders. All date and datetime values are strictly
 * handled as branded ISO strings, never as native Date types. An audit log is
 * written for successful updates.
 *
 * @param props - The properties for reminder update
 * @param props.technician - The authenticated technician user performing the
 *   update
 * @param props.appointmentId - The appointment ID which owns this reminder
 * @param props.reminderId - The reminder entity to be updated
 * @param props.body - The fields to update (reminder_time, recipient_type,
 *   recipient_id, delivery_channel, delivery_status)
 * @returns The updated appointment reminder entity
 * @throws {Error} When technician or reminder or appointment is not found, or
 *   update not permitted by business rules
 */
export async function puthealthcarePlatformTechnicianAppointmentsAppointmentIdRemindersReminderId(props: {
  technician: TechnicianPayload;
  appointmentId: string & tags.Format<"uuid">;
  reminderId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentReminder.IUpdate;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  const { technician, appointmentId, reminderId, body } = props;

  // 1. Defensive: Ensure technician is still active (not deleted)
  const techUser =
    await MyGlobal.prisma.healthcare_platform_technicians.findFirst({
      where: {
        id: technician.id,
        deleted_at: null,
      },
    });
  if (!techUser) throw new Error("Technician is not active or does not exist");

  // 2. Fetch the reminder entity
  const reminder =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.findFirst({
      where: {
        id: reminderId,
        appointment_id: appointmentId,
      },
    });
  if (!reminder) throw new Error("Reminder not found for given appointment");

  // 3. Fetch the linked appointment, ensure not cancelled/deleted/past
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: appointmentId,
        deleted_at: null,
      },
    });
  if (!appointment)
    throw new Error(
      "Appointment not found or has been deleted, cannot update reminders",
    );
  // Lookup status record for cancellation
  const statusRec =
    await MyGlobal.prisma.healthcare_platform_appointment_statuses.findFirst({
      where: { id: appointment.status_id },
    });
  if (!statusRec)
    throw new Error("Appointment status not found, cannot check cancellation");
  if (statusRec.status_code === "cancelled")
    throw new Error("Cannot update reminders for cancelled appointments");
  // Ensure appointment is not in the past (end_time < now)
  const nowISO = toISOStringSafe(new Date());
  if (appointment.end_time < nowISO)
    throw new Error("Cannot update reminders for appointments in the past");
  // Ensure reminder not already delivered/sent
  if (reminder.delivered_at !== null || reminder.delivery_status === "sent") {
    throw new Error("Cannot update reminders that are already delivered/sent");
  }
  // 4. Prepare mutable update object only with provided fields
  const updateData: {
    reminder_time?: string & tags.Format<"date-time">;
    recipient_type?: string;
    recipient_id?: string & tags.Format<"uuid">;
    delivery_channel?: string;
    delivery_status?: string;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: nowISO,
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

  const updated =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.update({
      where: { id: reminderId },
      data: updateData,
    });

  // 5. Write audit log for this update (not blocking)
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: technician.id,
      organization_id: null,
      action_type: "APPOINTMENT_REMINDER_UPDATED",
      event_context: JSON.stringify({
        appointmentId,
        reminderId,
        updateFields: Object.keys(updateData),
      }),
      ip_address: undefined,
      related_entity_type: "APPOINTMENT_REMINDER",
      related_entity_id: reminderId,
      created_at: nowISO,
    },
  });

  // 6. Return DTO-compliant response with ISO date strings strictly used
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
