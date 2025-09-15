import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Soft delete (disable) a healthcare platform reminder by reminderId.
 *
 * This operation marks the specified reminder as deleted (soft delete) by
 * updating its deleted_at timestamp. Only the medical doctor who owns the
 * reminder may delete it. Reminders in finalized, compliance-locked, or
 * already-deleted state are protected from deletion and an error is thrown if
 * deletion is attempted. All such delete actions are recorded in the
 * healthcare_platform_audit_logs table for compliance and traceability.
 *
 * @param props - Function parameter object
 * @param props.medicalDoctor - Authenticated medical doctor performing the
 *   operation
 * @param props.reminderId - Unique identifier of the reminder to delete
 * @returns Void if successful
 * @throws Error if reminder does not exist, is already deleted, is
 *   locked/finalized, or access is forbidden
 */
export async function deletehealthcarePlatformMedicalDoctorRemindersReminderId(props: {
  medicalDoctor: MedicaldoctorPayload;
  reminderId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch reminder
  const reminder =
    await MyGlobal.prisma.healthcare_platform_reminders.findFirst({
      where: { id: props.reminderId },
    });
  if (!reminder) throw new Error("Reminder not found");

  // Step 2: Ownership check
  if (reminder.target_user_id !== props.medicalDoctor.id)
    throw new Error(
      "Forbidden: Only the owning doctor may delete their reminder",
    );

  // Step 3: Already deleted?
  if (reminder.deleted_at != null)
    throw new Error("Reminder is already deleted");

  // Step 4: Business status logic
  const forbiddenStatuses = ["finalized", "fulfilled", "compliance_locked"];
  if (forbiddenStatuses.includes(reminder.status))
    throw new Error(
      "Cannot delete reminders in finalized or compliance-locked states",
    );

  // Step 5: Soft-delete reminder
  const deleted_at: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.healthcare_platform_reminders.update({
    where: { id: props.reminderId },
    data: { deleted_at },
  });

  // Step 6: Compliance audit log
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: props.medicalDoctor.id,
      action_type: "REMINDER_DELETE",
      related_entity_type: "REMINDER",
      related_entity_id: props.reminderId,
      created_at: deleted_at,
    },
  });

  // Step 7: Done
  return;
}
