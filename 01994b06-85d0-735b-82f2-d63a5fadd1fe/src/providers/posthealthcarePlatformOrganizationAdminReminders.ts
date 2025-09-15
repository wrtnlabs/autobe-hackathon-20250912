import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new scheduled reminder for user or staff
 *
 * Creates a new scheduled reminder entry in the healthcarePlatform system for a
 * user or staff member. This operation will record the reminder in the
 * healthcare_platform_reminders table, assigning an ID, and storing all details
 * as required for downstream notification delivery and audit. If certain
 * optional properties are omitted, safe defaults (such as status: 'pending')
 * are used. All timestamps are normalized to ISO 8601 string format.
 *
 * Role and organizational authorization is enforced by the
 * OrganizationadminAuth decorator and payload usage. This operation performs no
 * additional validation, trusting upstream validation. On success, all reminder
 * information, including assigned ID and timestamps, are returned.
 *
 * @param props - Properties for operation
 * @param props.organizationAdmin - Authenticated organization admin (role
 *   enforced)
 * @param props.body - Data required to create the reminder, including schedule,
 *   user, type, and message
 * @returns The created reminder record (with all server metadata assigned)
 * @throws {Error} If database operation fails or if the user is not authorized
 *   (caught by upstream decorators)
 */
export async function posthealthcarePlatformOrganizationAdminReminders(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformReminder.ICreate;
}): Promise<IHealthcarePlatformReminder> {
  const { organizationAdmin, body } = props;

  // Always-set fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Prepare insertion data (no mutation, no assertions, all composes functionally)
  const id: string & tags.Format<"uuid"> = v4();

  // Create reminder in DB
  const reminder = await MyGlobal.prisma.healthcare_platform_reminders.create({
    data: {
      id,
      organization_id:
        typeof body.organization_id === "string" ? body.organization_id : null,
      target_user_id:
        typeof body.target_user_id === "string" ? body.target_user_id : null,
      reminder_type: body.reminder_type,
      reminder_message: body.reminder_message,
      scheduled_for: body.scheduled_for,
      status:
        typeof body.status === "string" && body.status.length > 0
          ? body.status
          : "pending",
      delivered_at:
        typeof body.delivered_at === "string" ? body.delivered_at : null,
      acknowledged_at:
        typeof body.acknowledged_at === "string" ? body.acknowledged_at : null,
      snoozed_until:
        typeof body.snoozed_until === "string" ? body.snoozed_until : null,
      failure_reason:
        typeof body.failure_reason === "string" ? body.failure_reason : null,
      created_at: now,
      updated_at: now,
    },
    select: {
      id: true,
      target_user_id: true,
      organization_id: true,
      reminder_type: true,
      reminder_message: true,
      scheduled_for: true,
      status: true,
      delivered_at: true,
      acknowledged_at: true,
      snoozed_until: true,
      failure_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  // Compose return object, always normalizing dates to correct string format
  return {
    id: reminder.id,
    target_user_id: reminder.target_user_id ?? undefined,
    organization_id: reminder.organization_id ?? undefined,
    reminder_type: reminder.reminder_type,
    reminder_message: reminder.reminder_message,
    scheduled_for: toISOStringSafe(reminder.scheduled_for),
    status: reminder.status,
    delivered_at:
      reminder.delivered_at !== null && reminder.delivered_at !== undefined
        ? toISOStringSafe(reminder.delivered_at)
        : undefined,
    acknowledged_at:
      reminder.acknowledged_at !== null &&
      reminder.acknowledged_at !== undefined
        ? toISOStringSafe(reminder.acknowledged_at)
        : undefined,
    snoozed_until:
      reminder.snoozed_until !== null && reminder.snoozed_until !== undefined
        ? toISOStringSafe(reminder.snoozed_until)
        : undefined,
    failure_reason: reminder.failure_reason ?? undefined,
    created_at: toISOStringSafe(reminder.created_at),
    updated_at: toISOStringSafe(reminder.updated_at),
    deleted_at:
      reminder.deleted_at !== null && reminder.deleted_at !== undefined
        ? toISOStringSafe(reminder.deleted_at)
        : undefined,
  };
}
