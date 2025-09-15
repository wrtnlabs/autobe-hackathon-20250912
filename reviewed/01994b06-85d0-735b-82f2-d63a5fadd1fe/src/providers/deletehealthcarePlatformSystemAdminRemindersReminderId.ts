import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Soft delete (disable) a healthcare platform reminder.
 *
 * This operation performs a soft delete by setting the reminder's deleted_at
 * timestamp, excluding it from active workflows, but retaining it for
 * compliance and audit purposes. Reminders in 'finalized' or
 * 'compliance_locked' state, or those already soft deleted, cannot be removed.
 * Every successful deletion is written to the platform audit log for full
 * legal/audit trail.
 *
 * Authorization: Only authenticated system admin (SystemadminPayload) may
 * invoke this operation.
 *
 * @param props - Properties for soft-deleting a reminder
 * @param props.systemAdmin - The authenticated system admin making the request
 * @param props.reminderId - The unique identifier of the reminder to delete
 * @returns Void
 * @throws {Error} If reminder is not found, already deleted, or in
 *   finalized/compliance_locked state
 */
export async function deletehealthcarePlatformSystemAdminRemindersReminderId(props: {
  systemAdmin: SystemadminPayload;
  reminderId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, reminderId } = props;
  // Step 1: Find reminder and ensure it's not deleted
  const reminder =
    await MyGlobal.prisma.healthcare_platform_reminders.findFirst({
      where: { id: reminderId, deleted_at: null },
      select: { id: true, status: true, organization_id: true },
    });
  if (!reminder) {
    throw new Error("Reminder not found or already deleted");
  }
  // Step 2: Check for finalized/compliance lock
  if (
    reminder.status === "finalized" ||
    reminder.status === "compliance_locked"
  ) {
    throw new Error(
      "Reminder cannot be deleted in finalized or compliance locked state",
    );
  }
  // Step 3: Soft delete - set deleted_at
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_reminders.update({
    where: { id: reminderId },
    data: { deleted_at: now },
  });
  // Step 4: Audit
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: systemAdmin.id,
      organization_id: reminder.organization_id ?? undefined,
      action_type: "REMINDER_DELETE",
      event_context: JSON.stringify({ reminderId }),
      related_entity_type: "REMINDER",
      related_entity_id: reminderId,
      created_at: now,
    },
  });
}
