import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Get a single reminder by ID (detail view)
 *
 * Retrieve the full details for a specified reminder ID, including recipient,
 * type/class, delivery schedule, status, notification channel, and lifecycle
 * history.
 *
 * This operation allows users with valid access rights to inspect a reminder
 * record by its unique UUID, supporting user portals, compliance review, or
 * troubleshooting workflows. It ensures that PHI or sensitive notification
 * content is only accessible to users authorized by organizational or
 * role-based policy (in this case, the assigned receptionist).
 *
 * @param props - Request properties
 * @param props.receptionist - Authenticated receptionist (ReceptionistPayload)
 * @param props.reminderId - UUID of the reminder to fetch
 * @returns Full details for the specified reminder, including schedule, status,
 *   recipient, and history
 * @throws {Error} If the reminder does not exist or the assigned user does not
 *   match the authenticated receptionist
 */
export async function gethealthcarePlatformReceptionistRemindersReminderId(props: {
  receptionist: ReceptionistPayload;
  reminderId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformReminder> {
  const { receptionist, reminderId } = props;

  // Fetch the reminder by ID, ensure not deleted
  const reminder =
    await MyGlobal.prisma.healthcare_platform_reminders.findFirst({
      where: {
        id: reminderId,
        deleted_at: null,
      },
    });
  if (!reminder) {
    throw new Error("Reminder not found");
  }
  // Only allow access if actually assigned to this receptionist
  if (reminder.target_user_id !== receptionist.id) {
    throw new Error("Forbidden: Cannot access this reminder");
  }

  return {
    id: reminder.id,
    target_user_id:
      reminder.target_user_id === null ? undefined : reminder.target_user_id,
    organization_id:
      reminder.organization_id === null ? undefined : reminder.organization_id,
    reminder_type: reminder.reminder_type,
    reminder_message: reminder.reminder_message,
    scheduled_for: toISOStringSafe(reminder.scheduled_for),
    status: reminder.status,
    delivered_at:
      reminder.delivered_at === null
        ? undefined
        : toISOStringSafe(reminder.delivered_at),
    acknowledged_at:
      reminder.acknowledged_at === null
        ? undefined
        : toISOStringSafe(reminder.acknowledged_at),
    snoozed_until:
      reminder.snoozed_until === null
        ? undefined
        : toISOStringSafe(reminder.snoozed_until),
    failure_reason: reminder.failure_reason ?? undefined,
    created_at: toISOStringSafe(reminder.created_at),
    updated_at:
      reminder.updated_at == null
        ? undefined
        : toISOStringSafe(reminder.updated_at),
    deleted_at:
      reminder.deleted_at === null
        ? undefined
        : toISOStringSafe(reminder.deleted_at),
  };
}
