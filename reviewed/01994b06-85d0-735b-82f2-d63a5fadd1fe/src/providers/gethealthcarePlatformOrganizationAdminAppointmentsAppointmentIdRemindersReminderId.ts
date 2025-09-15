import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get a specific appointment reminder by ID for review or audit
 * (healthcare_platform_appointment_reminders).
 *
 * This endpoint fetches the details of a specific reminder associated with a
 * given appointment in the healthcare scheduling system. It ensures strict
 * access control: only organization administrators whose organization owns the
 * appointment may access reminder details. Soft-deleted reminders are excluded
 * from query results.
 *
 * @param props - The operation parameters
 * @param props.organizationAdmin - The authenticated organization admin payload
 *   (must own the appointment)
 * @param props.appointmentId - The appointment's unique identifier (UUID)
 * @param props.reminderId - The unique identifier of the reminder to retrieve
 *   (UUID)
 * @returns Details for the target reminder, including timing, recipient info,
 *   channel, and delivery status
 * @throws {Error} If the reminder or appointment is not found, or access is
 *   denied due to org mismatch
 */
export async function gethealthcarePlatformOrganizationAdminAppointmentsAppointmentIdRemindersReminderId(props: {
  organizationAdmin: OrganizationadminPayload;
  appointmentId: string & tags.Format<"uuid">;
  reminderId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  const { organizationAdmin, appointmentId, reminderId } = props;

  // Step 1: Fetch the reminder (must exist, belong to appointment)
  const reminder =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.findFirst({
      where: {
        id: reminderId,
        appointment_id: appointmentId,
      },
      select: {
        id: true,
        appointment_id: true,
        reminder_time: true,
        recipient_type: true,
        recipient_id: true,
        delivery_channel: true,
        delivery_status: true,
        created_at: true,
        updated_at: true,
      },
    });
  if (!reminder) throw new Error("Appointment reminder not found");

  // Step 2: Fetch appointment and check ownership
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { id: reminder.appointment_id },
      select: { healthcare_platform_organization_id: true },
    });
  if (
    !appointment ||
    appointment.healthcare_platform_organization_id !== organizationAdmin.id
  ) {
    throw new Error(
      "Access denied: Permission denied for this appointment reminder",
    );
  }

  // Step 3: Map and return, converting date/time fields
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
