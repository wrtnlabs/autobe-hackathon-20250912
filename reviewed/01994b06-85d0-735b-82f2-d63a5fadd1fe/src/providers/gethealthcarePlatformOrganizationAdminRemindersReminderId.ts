import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get a single reminder by ID (detail view)
 *
 * Retrieve the full details for a specified reminder ID, including recipient,
 * type/class, delivery schedule, status, notification content, and lifecycle
 * fields.
 *
 * This endpoint allows an authenticated organization admin to fetch any active
 * (not deleted) reminder in their organization by its unique UUID, supporting
 * portal detail views, compliance audit, or troubleshooting use cases. PHI and
 * sensitive reminder content is only accessible if the record is not deleted.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the retrieval
 * @param props.reminderId - The UUID of the reminder to fetch
 * @returns Full details for the specified reminder, including scheduled/past
 *   notification data
 * @throws {Error} If the reminder does not exist or is deleted
 */
export async function gethealthcarePlatformOrganizationAdminRemindersReminderId(props: {
  organizationAdmin: OrganizationadminPayload;
  reminderId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformReminder> {
  const { reminderId } = props;
  const reminder =
    await MyGlobal.prisma.healthcare_platform_reminders.findFirstOrThrow({
      where: {
        id: reminderId,
        deleted_at: null,
      },
    });
  return {
    id: reminder.id,
    target_user_id: reminder.target_user_id ?? undefined,
    organization_id: reminder.organization_id ?? undefined,
    reminder_type: reminder.reminder_type,
    reminder_message: reminder.reminder_message,
    scheduled_for: toISOStringSafe(reminder.scheduled_for),
    status: reminder.status,
    delivered_at:
      typeof reminder.delivered_at === "object" &&
      reminder.delivered_at !== null
        ? toISOStringSafe(reminder.delivered_at)
        : undefined,
    acknowledged_at:
      typeof reminder.acknowledged_at === "object" &&
      reminder.acknowledged_at !== null
        ? toISOStringSafe(reminder.acknowledged_at)
        : undefined,
    snoozed_until:
      typeof reminder.snoozed_until === "object" &&
      reminder.snoozed_until !== null
        ? toISOStringSafe(reminder.snoozed_until)
        : undefined,
    failure_reason: reminder.failure_reason ?? undefined,
    created_at: toISOStringSafe(reminder.created_at),
    updated_at: reminder.updated_at
      ? toISOStringSafe(reminder.updated_at)
      : undefined,
    deleted_at: reminder.deleted_at
      ? toISOStringSafe(reminder.deleted_at)
      : undefined,
  };
}
