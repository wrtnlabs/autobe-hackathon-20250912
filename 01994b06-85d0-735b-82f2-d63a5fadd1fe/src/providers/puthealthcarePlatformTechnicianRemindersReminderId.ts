import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Update an existing healthcare platform reminder (reminderId).
 *
 * This operation allows an authenticated technician to update a reminder in the
 * system, changing fields such as type, message, scheduled-for datetime,
 * status, and delivery tracking fields. Only non-finalized and non-deleted
 * reminders may be updated. Updates are allowed only if the technician owns the
 * reminder (target_user_id matches technician.id) or the reminder is unowned
 * (organization-wide). Immutable fields (id, created_at, deleted_at) cannot be
 * updated. All changes update the "updated_at" field, and only valid field
 * patches are accepted. Soft-deleted (archived) reminders are not updatable.
 * Attempts to modify reminders in finalized or compliance-locked states are
 * rejected. Fully compliant with business and audit requirements per healthcare
 * platform policy.
 *
 * @param props - Operation parameters
 * @param props.technician - The authenticated technician user performing the
 *   update
 * @param props.reminderId - UUID of the reminder to update
 * @param props.body - Fields to update; all fields are optional and only those
 *   allowed by business rules may be modified
 * @returns The updated reminder entity after modifications are applied
 * @throws {Error} If the reminder does not exist, is soft-deleted, is
 *   finalized, or the technician lacks update permission
 */
export async function puthealthcarePlatformTechnicianRemindersReminderId(props: {
  technician: TechnicianPayload;
  reminderId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformReminder.IUpdate;
}): Promise<IHealthcarePlatformReminder> {
  const { technician, reminderId, body } = props;

  // Find the reminder, exclude soft-deleted
  const reminder =
    await MyGlobal.prisma.healthcare_platform_reminders.findFirst({
      where: {
        id: reminderId,
        deleted_at: null,
      },
    });
  if (!reminder) throw new Error("Reminder not found or already deleted");

  // Check finalized status
  if (reminder.status === "acknowledged" || reminder.status === "cancelled") {
    throw new Error("Cannot update a finalized or compliance-locked reminder");
  }

  // Ownership check: can only update reminders if technician owns it, or if no target_user_id is set
  if (
    typeof reminder.target_user_id === "string" &&
    reminder.target_user_id !== technician.id
  ) {
    throw new Error("You do not have permission to update this reminder");
  }

  // Build update object strictly from allowed/present fields and convert dates using toISOStringSafe
  const updates = {
    ...(body.reminder_type !== undefined && {
      reminder_type: body.reminder_type,
    }),
    ...(body.reminder_message !== undefined && {
      reminder_message: body.reminder_message,
    }),
    ...(body.scheduled_for !== undefined &&
      body.scheduled_for !== null && {
        scheduled_for: toISOStringSafe(body.scheduled_for),
      }),
    ...(body.status !== undefined && { status: body.status }),
    // Nullable date fields handled for null/undefined
    ...(body.delivered_at !== undefined && {
      delivered_at:
        body.delivered_at === null ? null : toISOStringSafe(body.delivered_at),
    }),
    ...(body.acknowledged_at !== undefined && {
      acknowledged_at:
        body.acknowledged_at === null
          ? null
          : toISOStringSafe(body.acknowledged_at),
    }),
    ...(body.snoozed_until !== undefined && {
      snoozed_until:
        body.snoozed_until === null
          ? null
          : toISOStringSafe(body.snoozed_until),
    }),
    ...(body.failure_reason !== undefined && {
      failure_reason: body.failure_reason,
    }),
    // Always update updated_at
    updated_at: toISOStringSafe(new Date()),
  };

  const updated = await MyGlobal.prisma.healthcare_platform_reminders.update({
    where: { id: reminderId },
    data: updates,
  });

  return {
    id: updated.id,
    target_user_id: updated.target_user_id ?? undefined,
    organization_id: updated.organization_id ?? undefined,
    reminder_type: updated.reminder_type,
    reminder_message: updated.reminder_message,
    scheduled_for: toISOStringSafe(updated.scheduled_for),
    status: updated.status,
    delivered_at: updated.delivered_at
      ? toISOStringSafe(updated.delivered_at)
      : undefined,
    acknowledged_at: updated.acknowledged_at
      ? toISOStringSafe(updated.acknowledged_at)
      : undefined,
    snoozed_until: updated.snoozed_until
      ? toISOStringSafe(updated.snoozed_until)
      : undefined,
    failure_reason: updated.failure_reason ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
