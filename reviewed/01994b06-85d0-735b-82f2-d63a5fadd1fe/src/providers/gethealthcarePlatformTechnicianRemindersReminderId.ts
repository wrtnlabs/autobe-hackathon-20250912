import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Get a single reminder by ID (detail view)
 *
 * Retrieves the full details for a specified reminder ID, including recipient,
 * type/class, delivery schedule, status, and timestamps. Ensures that only the
 * technician who is assigned as the target_user_id on the reminder may view
 * this record. Soft-deleted reminders are excluded.
 *
 * @param props - The props containing technician (authentication) and
 *   reminderId to fetch
 * @param props.technician - The authenticated technician payload, containing
 *   their user id and role
 * @param props.reminderId - The unique UUID of the reminder to fetch
 * @returns An IHealthcarePlatformReminder object containing all
 *   schedule/status/detail fields for a reminder
 * @throws {Error} When the reminder does not exist, is soft-deleted, or does
 *   not belong to this technician
 */
export async function gethealthcarePlatformTechnicianRemindersReminderId(props: {
  technician: TechnicianPayload;
  reminderId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformReminder> {
  const { technician, reminderId } = props;

  const reminder =
    await MyGlobal.prisma.healthcare_platform_reminders.findFirst({
      where: {
        id: reminderId,
        target_user_id: technician.id,
        deleted_at: null,
      },
    });
  if (!reminder) {
    throw new Error("Reminder not found or access denied");
  }

  return {
    id: reminder.id,
    target_user_id: reminder.target_user_id ?? undefined,
    organization_id: reminder.organization_id ?? undefined,
    reminder_type: reminder.reminder_type,
    reminder_message: reminder.reminder_message,
    scheduled_for: toISOStringSafe(reminder.scheduled_for),
    status: reminder.status,
    delivered_at: reminder.delivered_at
      ? toISOStringSafe(reminder.delivered_at)
      : undefined,
    acknowledged_at: reminder.acknowledged_at
      ? toISOStringSafe(reminder.acknowledged_at)
      : undefined,
    snoozed_until: reminder.snoozed_until
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
