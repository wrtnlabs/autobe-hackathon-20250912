import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Update an existing healthcare platform reminder (reminderId).
 *
 * Allows an authenticated nurse to update mutable fields of a reminder entity,
 * such as delivery time, message, type, or status. Business and audit rules are
 * enforced: only reminders not soft-deleted or locked (e.g., by compliance,
 * completed, or archived status) may be updated, and only by authorized nurses
 * responsible for the reminder. All changes are audited by updating updated_at.
 * Date fields are safely converted. Immutable fields are not changed.
 *
 * @param props - Parameters for the update operation
 * @param props.nurse - The authenticated nurse (must be responsible for the
 *   reminder, i.e., target_user_id or none)
 * @param props.reminderId - Unique identifier of the reminder to update
 * @param props.body - The fields to update (partial/mutable fields only)
 * @returns The updated reminder entity as per IHealthcarePlatformReminder
 * @throws {Error} If no such reminder exists, already deleted, forbidden, or
 *   locked
 */
export async function puthealthcarePlatformNurseRemindersReminderId(props: {
  nurse: NursePayload;
  reminderId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformReminder.IUpdate;
}): Promise<IHealthcarePlatformReminder> {
  const { nurse, reminderId, body } = props;

  // Find the reminder, only if not soft-deleted
  const existing =
    await MyGlobal.prisma.healthcare_platform_reminders.findFirst({
      where: { id: reminderId, deleted_at: null },
    });
  if (!existing) {
    throw new Error("Reminder not found or already deleted");
  }

  // Authorization: nurse can only update reminders assigned to them (target_user_id == nurse.id) or if unassigned (null/undefined)
  if (
    typeof existing.target_user_id === "string" &&
    existing.target_user_id !== nurse.id
  ) {
    throw new Error("Forbidden: cannot update this reminder");
  }

  // Prevent update if status is business-locked or compliance/etc. (adjust logic as required by policy)
  if (
    existing.status === "completed" ||
    existing.status === "archived" ||
    existing.status === "compliance_locked"
  ) {
    throw new Error("Reminder cannot be updated in its current state");
  }

  // Prepare the update, setting only updatable fields
  // (updated_at must always be set; all others are optional)
  const updated = await MyGlobal.prisma.healthcare_platform_reminders.update({
    where: { id: reminderId },
    data: {
      reminder_type: body.reminder_type ?? undefined,
      reminder_message: body.reminder_message ?? undefined,
      scheduled_for: body.scheduled_for
        ? toISOStringSafe(body.scheduled_for)
        : undefined,
      status: body.status ?? undefined,
      delivered_at:
        body.delivered_at === null
          ? null
          : body.delivered_at !== undefined
            ? toISOStringSafe(body.delivered_at)
            : undefined,
      acknowledged_at:
        body.acknowledged_at === null
          ? null
          : body.acknowledged_at !== undefined
            ? toISOStringSafe(body.acknowledged_at)
            : undefined,
      snoozed_until:
        body.snoozed_until === null
          ? null
          : body.snoozed_until !== undefined
            ? toISOStringSafe(body.snoozed_until)
            : undefined,
      failure_reason: body.failure_reason ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
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
      updated.delivered_at == null
        ? undefined
        : toISOStringSafe(updated.delivered_at),
    acknowledged_at:
      updated.acknowledged_at == null
        ? undefined
        : toISOStringSafe(updated.acknowledged_at),
    snoozed_until:
      updated.snoozed_until == null
        ? undefined
        : toISOStringSafe(updated.snoozed_until),
    failure_reason: updated.failure_reason ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at == null
        ? undefined
        : toISOStringSafe(updated.deleted_at),
  };
}
