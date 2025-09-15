import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Create a new scheduled reminder for user or staff (department head access).
 *
 * This endpoint writes reminder data to the healthcare_platform_reminders
 * table. It uses payload and role authorization to create reminders for staff,
 * provider, or system assignments. Output is the full reminder record as
 * stored, with all audit metadata and returned date fields as ISO strings. Only
 * department head users may trigger this operation (access enforced at
 * controller/decorator).
 *
 * @param props - The operation props, including authenticated departmentHead
 *   payload and IHealthcarePlatformReminder.ICreate body
 * @returns The full created IHealthcarePlatformReminder object (with
 *   system-generated id, audit, and dates)
 * @throws {Error} If database failure or department head not authorized
 */
export async function posthealthcarePlatformDepartmentHeadReminders(props: {
  departmentHead: DepartmentheadPayload;
  body: IHealthcarePlatformReminder.ICreate;
}): Promise<IHealthcarePlatformReminder> {
  const now = toISOStringSafe(new Date());
  const insert = await MyGlobal.prisma.healthcare_platform_reminders.create({
    data: {
      id: v4(),
      reminder_type: props.body.reminder_type,
      reminder_message: props.body.reminder_message,
      scheduled_for: props.body.scheduled_for,
      status:
        props.body.status !== undefined && props.body.status !== null
          ? props.body.status
          : "pending",
      target_user_id: props.body.target_user_id ?? undefined,
      organization_id: props.body.organization_id ?? undefined,
      delivered_at: props.body.delivered_at ?? undefined,
      acknowledged_at: props.body.acknowledged_at ?? undefined,
      snoozed_until: props.body.snoozed_until ?? undefined,
      failure_reason: props.body.failure_reason ?? undefined,
      created_at: now,
      updated_at: now,
    },
  });
  return {
    id: insert.id,
    target_user_id: insert.target_user_id ?? undefined,
    organization_id: insert.organization_id ?? undefined,
    reminder_type: insert.reminder_type,
    reminder_message: insert.reminder_message,
    scheduled_for: toISOStringSafe(insert.scheduled_for),
    status: insert.status,
    delivered_at: insert.delivered_at
      ? toISOStringSafe(insert.delivered_at)
      : undefined,
    acknowledged_at: insert.acknowledged_at
      ? toISOStringSafe(insert.acknowledged_at)
      : undefined,
    snoozed_until: insert.snoozed_until
      ? toISOStringSafe(insert.snoozed_until)
      : undefined,
    failure_reason: insert.failure_reason ?? undefined,
    created_at: toISOStringSafe(insert.created_at),
    updated_at: toISOStringSafe(insert.updated_at),
    deleted_at: insert.deleted_at
      ? toISOStringSafe(insert.deleted_at)
      : undefined,
  };
}
