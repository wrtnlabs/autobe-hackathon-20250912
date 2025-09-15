import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Soft-delete (logically remove) a specific appointment reminder.
 *
 * This operation attempts to mark a healthcare_platform_appointment_reminders
 * record as deleted, but the schema does not provide a `deleted_at` column.
 *
 * Instead, the implementation will hard delete the record. If soft delete is
 * added in the schema in the future, this logic should be updated.
 *
 * @param props - Contains system admin payload, appointmentId, and reminderId
 * @throws {Error} When the reminder does not exist
 */
export async function deletehealthcarePlatformSystemAdminAppointmentsAppointmentIdRemindersReminderId(props: {
  systemAdmin: SystemadminPayload;
  appointmentId: string & tags.Format<"uuid">;
  reminderId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { appointmentId, reminderId } = props;

  // Find reminder to confirm it exists (throws otherwise)
  const reminder =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.findFirst({
      where: {
        id: reminderId,
        appointment_id: appointmentId,
      },
    });

  if (!reminder) {
    throw new Error("Reminder not found or already removed");
  }

  // Remove the reminder (hard delete, as soft delete is not schema-supported)
  await MyGlobal.prisma.healthcare_platform_appointment_reminders.delete({
    where: { id: reminderId },
  });
}
