import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Soft delete (disable) a healthcare platform reminder by ID as the
 * authenticated technician.
 *
 * This operation updates the deleted_at timestamp (soft delete) for a reminder,
 * ensuring audit/compliance. Deletion is allowed only if:
 *
 * - The reminder exists and is not already deleted
 * - The technician is the assigned owner (target_user_id matches technician.id)
 * - The reminder is not in a finalized, locked, or completed state
 *
 * An audit log entry is always created to record the deletion event.
 *
 * @param props - Request properties
 * @param props.technician - The authenticated technician performing the delete
 * @param props.reminderId - The unique identifier of the reminder to delete
 * @returns Void
 * @throws {Error} When the reminder doesn't exist, is already deleted, not
 *   owned by technician, or is in a protected status
 */
export async function deletehealthcarePlatformTechnicianRemindersReminderId(props: {
  technician: TechnicianPayload;
  reminderId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { technician, reminderId } = props;

  // Query the reminder and ensure it's not already deleted
  const reminder =
    await MyGlobal.prisma.healthcare_platform_reminders.findFirst({
      where: {
        id: reminderId,
        deleted_at: null,
      },
    });
  if (!reminder) {
    throw new Error("Reminder does not exist or has already been deleted.");
  }

  // Ownership check
  if (reminder.target_user_id !== technician.id) {
    throw new Error("You do not have permission to delete this reminder.");
  }

  // Protected status check
  if (
    reminder.status === "finalized" ||
    reminder.status === "locked" ||
    reminder.status === "completed"
  ) {
    throw new Error(
      "Cannot delete a reminder that is finalized, locked, or completed.",
    );
  }

  // Prepare deletion timestamp
  const deletedAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );

  // Perform soft delete
  await MyGlobal.prisma.healthcare_platform_reminders.update({
    where: { id: reminderId },
    data: {
      deleted_at: deletedAt,
      updated_at: deletedAt,
    },
  });

  // Audit log for compliance
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: technician.id,
      organization_id: reminder.organization_id ?? null,
      action_type: "REMINDER_DELETE",
      related_entity_type: "REMINDER",
      related_entity_id: reminderId,
      created_at: deletedAt,
    },
  });
}
