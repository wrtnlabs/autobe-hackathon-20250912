import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing healthcare platform reminder (reminderId) in the
 * healthcare_platform_reminders table.
 *
 * This operation allows authorized system administrators to update the details
 * of an existing reminder in the healthcare platform. It supports changes to
 * schedule, content, type, and other updatable fields, but prohibits
 * modifications to finalized, deleted, or immutable reminders. All updates are
 * audited and mapped strictly to domain and compliance requirements.
 *
 * @param props - Request properties
 * @param props.systemAdmin - SystemadminPayload representing the authenticated
 *   system admin user
 * @param props.reminderId - Unique identifier of the reminder to update
 * @param props.body - Partial update fields for the reminder
 *   (IHealthcarePlatformReminder.IUpdate)
 * @returns The updated reminder object (IHealthcarePlatformReminder)
 * @throws {Error} When the reminder does not exist, is soft-deleted, or is in a
 *   finalized/immutable state.
 */
export async function puthealthcarePlatformSystemAdminRemindersReminderId(props: {
  systemAdmin: SystemadminPayload;
  reminderId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformReminder.IUpdate;
}): Promise<IHealthcarePlatformReminder> {
  const { reminderId, body } = props;

  // Fetch the original reminder record
  const existing =
    await MyGlobal.prisma.healthcare_platform_reminders.findUnique({
      where: { id: reminderId },
    });
  if (!existing) {
    throw new Error("Reminder not found");
  }
  if (existing.deleted_at !== null) {
    throw new Error("Cannot update a reminder that is deleted/archived");
  }
  // Prohibit update if status is finalized or immutable
  const FINALIZED_STATUSES = ["completed", "archived", "expired"];
  if (FINALIZED_STATUSES.includes(existing.status)) {
    throw new Error("Reminder is finalized and cannot be updated");
  }

  // Prepare the update object, only assign fields supplied in the request
  const updateInput: Record<string, unknown> = {
    ...(body.reminder_type !== undefined
      ? { reminder_type: body.reminder_type }
      : {}),
    ...(body.reminder_message !== undefined
      ? { reminder_message: body.reminder_message }
      : {}),
    ...(body.scheduled_for !== undefined
      ? { scheduled_for: body.scheduled_for }
      : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
    ...(body.delivered_at !== undefined
      ? { delivered_at: body.delivered_at }
      : {}),
    ...(body.acknowledged_at !== undefined
      ? { acknowledged_at: body.acknowledged_at }
      : {}),
    ...(body.snoozed_until !== undefined
      ? { snoozed_until: body.snoozed_until }
      : {}),
    ...(body.failure_reason !== undefined
      ? { failure_reason: body.failure_reason }
      : {}),
    updated_at: toISOStringSafe(new Date()),
  };

  // Apply the update
  const updated = await MyGlobal.prisma.healthcare_platform_reminders.update({
    where: { id: reminderId },
    data: updateInput,
  });

  return {
    id: updated.id,
    target_user_id: updated.target_user_id ?? undefined,
    organization_id: updated.organization_id ?? undefined,
    reminder_type: updated.reminder_type,
    reminder_message: updated.reminder_message,
    scheduled_for: toISOStringSafe(updated.scheduled_for),
    status: updated.status,
    delivered_at:
      updated.delivered_at !== null && updated.delivered_at !== undefined
        ? toISOStringSafe(updated.delivered_at)
        : undefined,
    acknowledged_at:
      updated.acknowledged_at !== null && updated.acknowledged_at !== undefined
        ? toISOStringSafe(updated.acknowledged_at)
        : undefined,
    snoozed_until:
      updated.snoozed_until !== null && updated.snoozed_until !== undefined
        ? toISOStringSafe(updated.snoozed_until)
        : undefined,
    failure_reason: updated.failure_reason ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
