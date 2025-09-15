import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Create a new scheduled reminder for user or staff
 *
 * This operation creates a new scheduled reminder in the healthcarePlatform
 * system for a user or staff member. It operates on the
 * healthcare_platform_reminders table, supporting the orchestration of
 * notifications for compliance, appointments, medication, or workflow events.
 * New reminders are subject to role and organizational access scope, and all
 * actions are fully auditable and subject to strict business and compliance
 * logic.
 *
 * @param props - The request payload
 *
 *   - Nurse: Authenticated NursePayload representing the nurse creating this
 *       reminder
 *   - Body: IHealthcarePlatformReminder.ICreate fields to define the new reminder
 *
 * @returns The created scheduled reminder entry, matching the shape of
 *   IHealthcarePlatformReminder
 * @throws {Error} If the operation fails to write to the database or mismatches
 *   found on fields
 */
export async function posthealthcarePlatformNurseReminders(props: {
  nurse: NursePayload;
  body: IHealthcarePlatformReminder.ICreate;
}): Promise<IHealthcarePlatformReminder> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.healthcare_platform_reminders.create({
    data: {
      id: v4(),
      reminder_type: props.body.reminder_type,
      reminder_message: props.body.reminder_message,
      scheduled_for: props.body.scheduled_for,
      status: props.body.status ?? "pending",
      target_user_id: props.body.target_user_id ?? undefined,
      organization_id: props.body.organization_id ?? undefined,
      delivered_at: props.body.delivered_at ?? undefined,
      acknowledged_at: props.body.acknowledged_at ?? undefined,
      snoozed_until: props.body.snoozed_until ?? undefined,
      failure_reason: props.body.failure_reason ?? undefined,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    reminder_type: created.reminder_type,
    reminder_message: created.reminder_message,
    scheduled_for: created.scheduled_for,
    status: created.status,
    target_user_id: created.target_user_id ?? undefined,
    organization_id: created.organization_id ?? undefined,
    delivered_at: created.delivered_at ?? undefined,
    acknowledged_at: created.acknowledged_at ?? undefined,
    snoozed_until: created.snoozed_until ?? undefined,
    failure_reason: created.failure_reason ?? undefined,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? undefined,
  };
}
