import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get a single reminder by ID (detail view)
 *
 * Retrieves the full details for a specified reminder by UUID, including
 * status, schedule, delivery states, and all audit metadata fields from
 * healthcare_platform_reminders. Allows system admin to access any reminder in
 * the platform for compliance/support/audit, regardless of org. Throws if the
 * reminder does not exist.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system admin performing the
 *   operation
 * @param props.reminderId - The unique reminder UUID to look up
 * @returns The full IHealthcarePlatformReminder object for the specified
 *   reminder
 * @throws {Error} If the reminder is not found
 */
export async function gethealthcarePlatformSystemAdminRemindersReminderId(props: {
  systemAdmin: SystemadminPayload;
  reminderId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformReminder> {
  const record = await MyGlobal.prisma.healthcare_platform_reminders.findFirst({
    where: { id: props.reminderId },
  });
  if (!record) throw new Error("Reminder not found");
  return {
    id: record.id,
    target_user_id: record.target_user_id ?? undefined,
    organization_id: record.organization_id ?? undefined,
    reminder_type: record.reminder_type,
    reminder_message: record.reminder_message,
    scheduled_for: toISOStringSafe(record.scheduled_for),
    status: record.status,
    delivered_at: record.delivered_at
      ? toISOStringSafe(record.delivered_at)
      : undefined,
    acknowledged_at: record.acknowledged_at
      ? toISOStringSafe(record.acknowledged_at)
      : undefined,
    snoozed_until: record.snoozed_until
      ? toISOStringSafe(record.snoozed_until)
      : undefined,
    failure_reason: record.failure_reason ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: record.updated_at
      ? toISOStringSafe(record.updated_at)
      : undefined,
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
