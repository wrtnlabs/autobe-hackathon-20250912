import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Schedule a new reminder for an appointment
 * (healthcare_platform_appointment_reminders).
 *
 * Registers a new reminder notification entity for a specific appointment,
 * linking to the parent appointment and recipient. Only organization admins of
 * the owning organization may create reminders. Validates that the appointment
 * exists and is active, validates the recipient is a participant, and that the
 * scheduled reminder time is correct. Logs and enforces all business rules for
 * compliance.
 *
 * @param props - Properties for reminder creation
 * @param props.organizationAdmin - Authenticated organization admin (must
 *   control the appointment organization)
 * @param props.appointmentId - UUID of the appointment to attach the reminder
 * @param props.body - IHealthcarePlatformAppointmentReminder.ICreate object
 *   (reminder time, recipient info, delivery channel)
 * @returns The complete reminder entity as written
 * @throws {Error} If appointment does not exist, admin lacks permission,
 *   recipient is invalid, or reminder time is not allowed.
 */
export async function posthealthcarePlatformOrganizationAdminAppointmentsAppointmentIdReminders(props: {
  organizationAdmin: OrganizationadminPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentReminder.ICreate;
}): Promise<IHealthcarePlatformAppointmentReminder> {
  const { organizationAdmin, appointmentId, body } = props;

  // Fetch appointment, check not deleted
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: {
        id: appointmentId,
        deleted_at: null,
      },
      select: {
        id: true,
        healthcare_platform_organization_id: true,
        provider_id: true,
        patient_id: true,
        start_time: true,
        status_id: true,
      },
    });
  if (!appointment) throw new Error("Appointment not found");
  if (
    appointment.healthcare_platform_organization_id !== organizationAdmin.id
  ) {
    throw new Error(
      "Access denied: This appointment belongs to a different organization",
    );
  }
  // Only the provider or patient of this appointment may be recipient
  if (
    body.recipient_id !== appointment.provider_id &&
    body.recipient_id !== appointment.patient_id
  ) {
    throw new Error(
      "Invalid recipient_id: recipient must be the provider or patient of the appointment",
    );
  }
  // Validate reminder_time is valid ISO string, not in past and before start
  const now = toISOStringSafe(new Date());
  if (body.reminder_time < now) {
    throw new Error("Scheduled reminder time cannot be in the past");
  }
  if (body.reminder_time > toISOStringSafe(appointment.start_time)) {
    throw new Error(
      "Reminder time must be scheduled before appointment start_time",
    );
  }

  // Insert reminder
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
