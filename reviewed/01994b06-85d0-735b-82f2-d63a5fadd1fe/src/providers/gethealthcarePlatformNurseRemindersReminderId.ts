import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Get a single reminder by ID (detail view)
 *
 * Retrieves full details for the specified reminder ID, including recipient,
 * type, delivery schedule, status, channel, and lifecycle history. Only
 * reminders targeted at the authenticated nurse and not deleted can be
 * accessed. Used for compliance, portal, or troubleshooting workflows. Throws
 * error if reminder does not exist or access is denied.
 *
 * @param props Object containing the authenticated nurse, and reminder ID
 * @param props.nurse The authenticated nurse (NursePayload)
 * @param props.reminderId The UUID of the reminder to retrieve
 * @returns The full details of the requested reminder, as
 *   IHealthcarePlatformReminder
 * @throws {Error} If the reminder does not exist or the nurse is not authorized
 *   to view it
 */
export async function gethealthcarePlatformNurseRemindersReminderId(props: {
  nurse: NursePayload;
  reminderId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformReminder> {
  const { nurse, reminderId } = props;
  const reminder =
    await MyGlobal.prisma.healthcare_platform_reminders.findFirst({
      where: {
        id: reminderId,
        target_user_id: nurse.id,
        deleted_at: null,
      },
    });
  if (!reminder) {
    throw new Error("Reminder not found or access denied");
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
    failure_reason:
      reminder.failure_reason === null ? undefined : reminder.failure_reason,
    created_at: toISOStringSafe(reminder.created_at),
    updated_at: reminder.updated_at
      ? toISOStringSafe(reminder.updated_at)
      : undefined,
    deleted_at:
      reminder.deleted_at === null
        ? undefined
        : toISOStringSafe(reminder.deleted_at),
  };
}
