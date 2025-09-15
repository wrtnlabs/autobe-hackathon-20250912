import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new scheduled reminder for user or staff
 *
 * This operation creates a new scheduled reminder in the healthcarePlatform
 * system for a user or staff member. It operates on the
 * healthcare_platform_reminders table, supporting notifications for compliance,
 * appointments, medication, or workflow events. The function enforces business
 * rules: validates that reminders can only be scheduled for future dates, and
 * that the target user exists if specified (in patients, technicians, or
 * receptionists). All datetime values are handled as ISO8601 strings. Errors
 * are thrown if validation fails. Audit and soft-delete metadata are assigned
 * and returned based on schema. This operation is available only to
 * authenticated systemAdmin users.
 *
 * @param props - Properties for scheduled reminder creation
 * @param props.systemAdmin - The authenticated system admin performing this
 *   action
 * @param props.body - Reminder creation details (type, message, target,
 *   schedule, etc)
 * @returns The newly created reminder record with full scheduling and audit
 *   metadata
 * @throws {Error} If target user does not exist, scheduled time is past, or
 *   database failure occurs
 */
export async function posthealthcarePlatformSystemAdminReminders(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformReminder.ICreate;
}): Promise<IHealthcarePlatformReminder> {
  // STEP 1: Validate that scheduled_for >= now
  const nowStr = toISOStringSafe(new Date());
  if (
    new Date(props.body.scheduled_for).getTime() < new Date(nowStr).getTime()
  ) {
    throw new Error("Cannot schedule reminder in the past.");
  }

  // STEP 2: Validate target_user_id if provided
  if (
    props.body.target_user_id !== undefined &&
    props.body.target_user_id !== null
  ) {
    const [foundPatient, foundTechnician, foundReceptionist] =
      await Promise.all([
        MyGlobal.prisma.healthcare_platform_patients.findFirst({
          where: { id: props.body.target_user_id },
        }),
        MyGlobal.prisma.healthcare_platform_technicians.findFirst({
          where: { id: props.body.target_user_id },
        }),
        MyGlobal.prisma.healthcare_platform_receptionists.findFirst({
          where: { id: props.body.target_user_id },
        }),
      ]);
    if (!foundPatient && !foundTechnician && !foundReceptionist) {
      throw new Error("Target user does not exist.");
    }
  }

  // STEP 3: Insert reminder
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.healthcare_platform_reminders.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      target_user_id: props.body.target_user_id ?? null,
      organization_id: props.body.organization_id ?? null,
      reminder_type: props.body.reminder_type,
      reminder_message: props.body.reminder_message,
      scheduled_for: props.body.scheduled_for,
      status: props.body.status ?? "pending",
      delivered_at: props.body.delivered_at ?? null,
      acknowledged_at: props.body.acknowledged_at ?? null,
      snoozed_until: props.body.snoozed_until ?? null,
      failure_reason: props.body.failure_reason ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // STEP 4: Map to DTO
  return {
    id: created.id,
    target_user_id: created.target_user_id ?? undefined,
    organization_id: created.organization_id ?? undefined,
    reminder_type: created.reminder_type,
    reminder_message: created.reminder_message,
    scheduled_for: created.scheduled_for,
    status: created.status,
    delivered_at: created.delivered_at ?? undefined,
    acknowledged_at: created.acknowledged_at ?? undefined,
    snoozed_until: created.snoozed_until ?? undefined,
    failure_reason: created.failure_reason ?? undefined,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? undefined,
  };
}
