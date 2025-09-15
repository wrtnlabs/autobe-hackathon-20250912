import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Get a single reminder by ID (detail view)
 *
 * Retrieves the full details for a specified reminder, ensuring that the
 * patient may only access reminders assigned to their own user profile.
 * Includes enforcement of strict privacy boundaries for PHI. Returns all
 * business and notification details for the reminder.
 *
 * Only the owning patient is allowed to fetch a reminder. If the reminder does
 * not exist or is not owned by the authenticated patient, an error is thrown.
 *
 * @param props - Request properties
 * @param props.patient - The authenticated patient user attempting to access
 *   the reminder
 * @param props.reminderId - The unique reminder UUID to fetch
 * @returns The full reminder details matching the specified ID
 * @throws {Error} If the reminder does not exist, is deleted, or is not owned
 *   by the authenticated patient
 */
export async function gethealthcarePlatformPatientRemindersReminderId(props: {
  patient: PatientPayload;
  reminderId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformReminder> {
  const { patient, reminderId } = props;
  const reminder =
    await MyGlobal.prisma.healthcare_platform_reminders.findFirst({
      where: {
        id: reminderId,
        deleted_at: null,
        target_user_id: patient.id,
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
    updated_at: toISOStringSafe(reminder.updated_at),
    deleted_at:
      reminder.deleted_at === null
        ? undefined
        : toISOStringSafe(reminder.deleted_at),
  };
}
