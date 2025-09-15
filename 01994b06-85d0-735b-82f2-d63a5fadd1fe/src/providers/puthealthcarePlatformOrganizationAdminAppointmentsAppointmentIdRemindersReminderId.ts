import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing appointment reminder
 * (healthcare_platform_appointment_reminders).
 *
 * This endpoint allows an organization admin to modify the scheduling or
 * content fields (reminder_time, recipient/channel, or delivery status) for a
 * reminder attached to a specific appointment. Updates are validated against
 * business logic: reminders for cancelled/expired/soft-deleted appointments, or
 * already delivered reminders, cannot be changed. All updates update the
 * updated_at timestamp.
 *
 * Strict date type compliance: all DateTime values are handled as string &
 * tags.Format<'date-time'>, and no native Date type is used. Updates use only
 * supplied fields from body; all non-updated fields remain unchanged.
 *
 * @param props - OrganizationAdmin: OrganizationadminPayload; // Authenticated
 *   admin (must be valid) appointmentId: string & tags.Format<'uuid'>; // The
 *   ID of the appointment to which the reminder belongs reminderId: string &
 *   tags.Format<'uuid'>; // The ID of the reminder to be updated body:
 *   IHealthcarePlatformAppointmentReminder.IUpdate // Update fields (partial,
 *   optional)
 * @returns The updated IHealthcarePlatformAppointmentReminder entity as the
 *   official API response
 * @throws {Error} If the reminder does not exist, is already delivered, or its
 *   appointment is non-editable (cancelled, deleted, ended)
 */
export async function puthealthcarePlatformOrganizationAdminAppointmentsAppointmentIdRemindersReminderId(props: {
  organizationAdmin: OrganizationadminPayload;
  appointmentId: string & tags.Format<"uuid">;
  reminderId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentReminder.IUpdate;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  const { organizationAdmin, appointmentId, reminderId, body } = props;

  // Step 1: Locate and validate the reminder (confirm it's for correct appointment)
  const reminder =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.findFirst({
      where: {
        id: reminderId,
        appointment_id: appointmentId,
      },
    });
  if (!reminder) throw new Error("Reminder not found");

  // Step 2: Find the associated appointment and status
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: appointmentId,
        deleted_at: null,
      },
      include: {
        status: true,
      },
    });
  if (
    !appointment ||
    appointment.status?.status_code === "cancelled" ||
    toISOStringSafe(appointment.end_time) < toISOStringSafe(new Date())
  ) {
    throw new Error("Appointment is not active, cancelled, or has ended");
  }

  // Step 3: Prevent update if already delivered
  if (reminder.delivery_status === "delivered") {
    throw new Error("Cannot update a delivered reminder");
  }

  // Step 4: Build update object (only provided fields + always updated_at)
  const updateData: Record<string, unknown> = {
    updated_at: toISOStringSafe(new Date()),
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

  // Step 5: Perform the update
  const updated =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.update({
      where: { id: reminderId },
      data: updateData,
    });

  // Step 6: Return all fields, converting DateTime to ISO strings
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
