import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Soft delete a healthcare platform reminder (reminderId) from the
 * healthcare_platform_reminders table (sets deleted_at).
 *
 * This operation marks the specified reminder as deleted (soft delete) by
 * updating its deleted_at timestamp. It enforces ownership (the authenticated
 * nurse must be the target of the reminder), blocks deletion if the reminder is
 * finalized or compliance-locked, and creates a full audit log entry. All
 * actions are compliance-ready and immutable. If the reminder has already been
 * deleted, is not owned by the nurse, or is protected, an error is thrown. All
 * date/datetime values are iso8601 strings and never native Date.
 *
 * @param props - Object containing all required fields
 * @param props.nurse - The authenticated nurse actor performing the deletion
 * @param props.reminderId - The unique UUID of the reminder to delete
 * @returns Void
 * @throws {Error} If the reminder does not exist, is already deleted, is not
 *   owned by this nurse, or is compliance-locked/finalized
 */
export async function deletehealthcarePlatformNurseRemindersReminderId(props: {
  nurse: NursePayload;
  reminderId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { nurse, reminderId } = props;

  // 1. Fetch the reminder, ensuring it isn't already soft-deleted
  const reminder =
    await MyGlobal.prisma.healthcare_platform_reminders.findFirstOrThrow({
      where: {
        id: reminderId,
        deleted_at: null,
      },
    });

  // 2. Ownership enforcement (nurse must be the target of the reminder)
  if (reminder.target_user_id !== nurse.id) {
    throw new Error(
      "Unauthorized: Only the owning nurse can delete this reminder.",
    );
  }

  // 3. Block deletion of finalized or compliance-locked reminders
  if (
    reminder.status === "finalized" ||
    reminder.status === "compliance_locked"
  ) {
    throw new Error(
      "Cannot delete a reminder that is finalized or compliance-locked.",
    );
  }

  // 4. Soft delete (update deleted_at with a valid ISO8601 string)
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  await MyGlobal.prisma.healthcare_platform_reminders.update({
    where: { id: reminderId },
    data: { deleted_at: deletedAt },
  });

  // 5. Write an audit log entry capturing the deletion event
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: nurse.id,
      // organization_id cannot be reliably written from this context
      organization_id: undefined,
      action_type: "REMINDER_SOFT_DELETE",
      related_entity_type: "REMINDER",
      related_entity_id: reminderId,
      created_at: deletedAt,
    },
  });
}
