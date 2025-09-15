import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Update an existing healthcare platform reminder (reminderId) in the
 * healthcare_platform_reminders table.
 *
 * This operation allows an authenticated patient to update fields (such as
 * message, schedule, and type) on their own reminder. The endpoint enforces
 * that only the owner (target user) can update their reminder, the reminder
 * must not be deleted or finalized, and no immutable audit fields can be
 * changed. It logs all changes for audit/compliance and validates that new
 * schedules are in the future. Updates are allowed only for active,
 * patient-owned reminders.
 *
 * @param props -
 *
 *   - Patient: The authenticated PatientPayload making the request
 *   - ReminderId: The UUID of the reminder to update
 *   - Body: (Partial) update fields for the reminder (message, status, timestamps,
 *       etc)
 *
 * @returns The updated IHealthcarePlatformReminder DTO object
 * @throws {Error} If the reminder is not found, owned by another user, deleted,
 *   finalized, or if validation fails
 */
export async function puthealthcarePlatformPatientRemindersReminderId(props: {
  patient: PatientPayload;
  reminderId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformReminder.IUpdate;
}): Promise<IHealthcarePlatformReminder> {
  const { patient, reminderId, body } = props;
  // Fetch reminder for ownership and not soft-deleted
  const reminder =
    await MyGlobal.prisma.healthcare_platform_reminders.findFirst({
      where: {
        id: reminderId,
        target_user_id: patient.id,
        deleted_at: null,
      },
    });
  if (!reminder) {
    throw new Error("Reminder not found or permission denied");
  }

  // Prevent update if reminder is finalized, cancelled, or expired
  if (["cancelled", "expired", "completed"].includes(reminder.status)) {
    throw new Error("Cannot update finalized or cancelled reminder");
  }

  // Require that at least one valid field is being updated
  const updateFields = [
    "reminder_type",
    "reminder_message",
    "scheduled_for",
    "status",
    "delivered_at",
    "acknowledged_at",
    "snoozed_until",
    "failure_reason",
  ];
  const hasUpdate = updateFields.some(
    (key) =>
      body[key as keyof IHealthcarePlatformReminder.IUpdate] !== undefined,
  );
  if (!hasUpdate) {
    throw new Error("Update body must include at least one non-empty field");
  }

  // scheduled_for must be in the future, if provided
  if (
    body.scheduled_for !== undefined &&
    new Date(body.scheduled_for).getTime() < Date.now()
  ) {
    throw new Error("Cannot schedule reminder in the past");
  }

  // Perform update: use only allowed, explicitly provided fields
  const updateResult =
    await MyGlobal.prisma.healthcare_platform_reminders.update({
      where: { id: reminderId },
      data: {
        reminder_type: body.reminder_type ?? undefined,
        reminder_message: body.reminder_message ?? undefined,
        scheduled_for: body.scheduled_for ?? undefined,
        status: body.status ?? undefined,
        delivered_at: body.delivered_at ?? undefined,
        acknowledged_at: body.acknowledged_at ?? undefined,
        snoozed_until: body.snoozed_until ?? undefined,
        failure_reason: body.failure_reason ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Transform updateResult to DTO (convert all date fields!)
  return {
    id: updateResult.id,
    target_user_id:
      updateResult.target_user_id === null
        ? undefined
        : updateResult.target_user_id,
    organization_id:
      updateResult.organization_id === null
        ? undefined
        : updateResult.organization_id,
    reminder_type: updateResult.reminder_type,
    reminder_message: updateResult.reminder_message,
    scheduled_for: toISOStringSafe(updateResult.scheduled_for),
    status: updateResult.status,
    delivered_at:
      updateResult.delivered_at === null
        ? undefined
        : toISOStringSafe(updateResult.delivered_at),
    acknowledged_at:
      updateResult.acknowledged_at === null
        ? undefined
        : toISOStringSafe(updateResult.acknowledged_at),
    snoozed_until:
      updateResult.snoozed_until === null
        ? undefined
        : toISOStringSafe(updateResult.snoozed_until),
    failure_reason:
      updateResult.failure_reason === null
        ? undefined
        : updateResult.failure_reason,
    created_at: toISOStringSafe(updateResult.created_at),
    updated_at: toISOStringSafe(updateResult.updated_at),
    deleted_at:
      updateResult.deleted_at === null
        ? undefined
        : toISOStringSafe(updateResult.deleted_at),
  };
}
