import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Soft-delete an appointment reminder
 * (healthcare_platform_appointment_reminders).
 *
 * This operation marks the specified reminder (by reminderId and appointmentId)
 * as deleted by setting the deleted_at timestamp, ensuring all audit,
 * compliance, and traceability rules are met. Reminders already delivered
 * cannot be deleted except via escalated workflows. This does NOT erase
 * reminder data but prevents business use until restored by separate processes.
 * Authorization is enforced via departmentHead authentication.
 *
 * @param props - Object containing required authentication and path parameters
 * @param props.departmentHead - Authenticated department head making the
 *   request
 * @param props.appointmentId - The appointment's unique UUID for which the
 *   reminder is being deleted
 * @param props.reminderId - The reminder's unique UUID to be soft-deleted
 * @returns Void
 * @throws {Error} When the reminder does not exist, is already soft-deleted, or
 *   is already delivered
 */
export async function deletehealthcarePlatformDepartmentHeadAppointmentsAppointmentIdRemindersReminderId(props: {
  departmentHead: DepartmentheadPayload;
  appointmentId: string & tags.Format<"uuid">;
  reminderId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { departmentHead, appointmentId, reminderId } = props;
  // Lookup: ensure reminder exists and is for the appointment
  const reminder =
    await MyGlobal.prisma.healthcare_platform_appointment_reminders.findFirst({
      where: {
        id: reminderId,
        appointment_id: appointmentId,
      },
    });
  if (!reminder) {
    throw new Error("Reminder not found or already deleted");
  }
  if (reminder.delivery_status === "delivered") {
    throw new Error("Cannot delete reminders that have already been delivered");
  }
  // Hard delete (since deleted_at does not exist)
  await MyGlobal.prisma.healthcare_platform_appointment_reminders.delete({
    where: { id: reminderId },
  });
}
