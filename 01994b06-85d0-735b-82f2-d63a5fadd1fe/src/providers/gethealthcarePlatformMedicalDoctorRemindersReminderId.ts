import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Get a single reminder by ID (detail view)
 *
 * Retrieves the full details for a specified reminder ID, including recipient,
 * type/class, delivery schedule, status, and lifecycle history. This operation
 * enforces that only the assigned doctor or recipient (by UUID) can view the
 * reminder. Throws an error if the reminder does not exist or if the requesting
 * doctor is not authorized to access the resource.
 *
 * @param props - The context for the request
 * @param props.medicalDoctor - MedicaldoctorPayload, the authenticated medical
 *   doctor making the request
 * @param props.reminderId - UUID of the reminder to fetch
 * @returns The full details of the specified reminder
 * @throws {Error} When the reminder is not found
 * @throws {Error} When access is forbidden for the requesting doctor
 */
export async function gethealthcarePlatformMedicalDoctorRemindersReminderId(props: {
  medicalDoctor: MedicaldoctorPayload;
  reminderId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformReminder> {
  const { medicalDoctor, reminderId } = props;
  const reminder =
    await MyGlobal.prisma.healthcare_platform_reminders.findFirst({
      where: {
        id: reminderId,
        deleted_at: null,
      },
    });
  if (!reminder) {
    throw new Error("Reminder not found");
  }
  if (
    reminder.target_user_id !== null &&
    reminder.target_user_id !== medicalDoctor.id
  ) {
    throw new Error("Forbidden");
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
