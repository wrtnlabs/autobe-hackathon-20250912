import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Soft-delete an appointment reminder
 * (healthcare_platform_appointment_reminders).
 *
 * This method deletes (removes) a reminder by ID for a given appointment as
 * organization admin. As the model has no soft-delete (no 'deleted_at' field),
 * this operation will physically delete the row. Only reminders that exist may
 * be deleted.
 *
 * @param props.organizationAdmin - Authenticated organizationadmin user
 * @param props.appointmentId - Appointment for which to delete the reminder
 * @param props.reminderId - Reminder ID to be deleted
 * @returns Void
 * @throws {Error} If reminder doesn't exist or does not belong to appointment
 */
export async function deletehealthcarePlatformOrganizationAdminAppointmentsAppointmentIdRemindersReminderId(props: {
  organizationAdmin: OrganizationadminPayload;
  appointmentId: string & tags.Format<"uuid">;
  reminderId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, appointmentId, reminderId } = props;
  // 1. Fetch reminder (must match ID and appointment)
  const reminder =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.findFirst({
      where: {
        id: reminderId,
        appointment_id: appointmentId,
      },
    });
  if (!reminder)
    throw new Error(
      "Reminder not found or does not belong to this appointment.",
    );
  // 2. Physically delete the reminder (no soft-delete supported)
  await MyGlobal.prisma.healthcare_platform_appointment_reminders.delete({
    where: { id: reminderId },
  });
}
