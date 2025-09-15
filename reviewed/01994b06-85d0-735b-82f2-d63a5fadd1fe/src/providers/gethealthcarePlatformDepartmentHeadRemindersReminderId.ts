import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Get a single reminder by ID (detail view)
 *
 * Retrieves the full details for a specified reminder ID from the
 * healthcare_platform_reminders table, including recipient, type/class,
 * delivery schedule, status, and full audit timestamps. Ensures only department
 * heads can access this route, but per-schema, reminders have no department ID,
 * so department-level access controls must be enforced elsewhere if needed.
 *
 * @param props - The parameter object
 * @param props.departmentHead - The authenticated department head making the
 *   request
 * @param props.reminderId - The UUID of the reminder to fetch
 * @returns The full reminder details as IHealthcarePlatformReminder
 * @throws {Error} If no active reminder exists with the specified ID
 */
export async function gethealthcarePlatformDepartmentHeadRemindersReminderId(props: {
  departmentHead: DepartmentheadPayload;
  reminderId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformReminder> {
  const { departmentHead, reminderId } = props;
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
    updated_at: toISOStringSafe(reminder.updated_at),
    deleted_at:
      reminder.deleted_at === null
        ? undefined
        : toISOStringSafe(reminder.deleted_at),
  };
}
