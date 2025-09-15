import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Update an existing healthcare platform reminder (reminderId) in the
 * healthcare_platform_reminders table.
 *
 * This operation allows a medical doctor to update an existing reminder, as
 * long as it has not been soft deleted or reached a finalized/immutable status
 * ("completed", "cancelled", "expired"). Only mutable business fields can be
 * changed. All changes are fully audited by updating the updated_at timestamp.
 * Attempts to update soft-deleted or finalized reminders will throw an error.
 *
 * @param props - Request properties
 * @param props.medicalDoctor - The authenticated medical doctor performing the
 *   update (authentication required)
 * @param props.reminderId - The unique id of the reminder to update
 * @param props.body - The partial fields to update on the reminder
 * @returns The updated reminder object after successful modification.
 * @throws {Error} When the reminder does not exist, is soft-deleted, or in
 *   finalized/immutable state
 */
export async function puthealthcarePlatformMedicalDoctorRemindersReminderId(props: {
  medicalDoctor: MedicaldoctorPayload;
  reminderId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformReminder.IUpdate;
}): Promise<IHealthcarePlatformReminder> {
  const { reminderId, body } = props;

  // 1. Fetch the reminder by its id
  const reminder =
    await MyGlobal.prisma.healthcare_platform_reminders.findUnique({
      where: { id: reminderId },
    });
  if (!reminder) throw new Error("Reminder not found");
  if (reminder.deleted_at !== null)
    throw new Error("Cannot update a soft-deleted reminder");

  // 2. Business rule: do not update if status is finalized/immutable
  const immutableStatuses = ["completed", "cancelled", "expired"];
  if (immutableStatuses.includes(reminder.status)) {
    throw new Error("Cannot update a finalized or immutable-state reminder");
  }

  // 3. Prepare update fields (partial update, skip absent fields)
  const updateData = {
    ...(body.reminder_type !== undefined && {
      reminder_type: body.reminder_type,
    }),
    ...(body.reminder_message !== undefined && {
      reminder_message: body.reminder_message,
    }),
    ...(body.scheduled_for !== undefined && {
      scheduled_for: body.scheduled_for,
    }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.delivered_at !== undefined && { delivered_at: body.delivered_at }),
    ...(body.acknowledged_at !== undefined && {
      acknowledged_at: body.acknowledged_at,
    }),
    ...(body.snoozed_until !== undefined && {
      snoozed_until: body.snoozed_until,
    }),
    ...(body.failure_reason !== undefined && {
      failure_reason: body.failure_reason,
    }),
    // Always bump updated_at
    updated_at: toISOStringSafe(new Date()),
  };

  // 4. Update the database record
  const updated = await MyGlobal.prisma.healthcare_platform_reminders.update({
    where: { id: reminderId },
    data: updateData,
  });

  // 5. Map Prisma entity to API DTO, converting Date fields to string/tag format, and preserving null/optional semantics
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
