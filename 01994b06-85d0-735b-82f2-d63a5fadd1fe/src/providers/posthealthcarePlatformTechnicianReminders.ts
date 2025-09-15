import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Create a new scheduled reminder for user or staff (technician API).
 *
 * This endpoint creates a scheduled reminder entry in the
 * healthcare_platform_reminders table. It enforces technician authentication,
 * assigns a UUID, timestamps, and default status ('pending') if not specified.
 * All date/datetime values are handled as ISO 8601 strings, and optional/null
 * fields are normalized per the IHealthcarePlatformReminder DTO contract. No
 * native Date type or 'as' assertions are used anywhere; structural and brand
 * types are honored through functional mapping.
 *
 * @param props - The parameters for this operation
 * @param props.technician - Authenticated technician's payload
 * @param props.body - Fields required for reminder creation (type, message,
 *   schedule, org/user, optional metadata)
 * @returns The full reminder object as created, including computed fields (id,
 *   timestamps)
 * @throws {Error} If database operation fails or required fields are missing
 */
export async function posthealthcarePlatformTechnicianReminders(props: {
  technician: TechnicianPayload;
  body: IHealthcarePlatformReminder.ICreate;
}): Promise<IHealthcarePlatformReminder> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.healthcare_platform_reminders.create({
    data: {
      id: v4(),
      reminder_type: props.body.reminder_type,
      reminder_message: props.body.reminder_message,
      scheduled_for: toISOStringSafe(props.body.scheduled_for),
      status:
        props.body.status !== undefined && props.body.status !== null
          ? props.body.status
          : "pending",
      target_user_id:
        props.body.target_user_id !== undefined &&
        props.body.target_user_id !== null
          ? props.body.target_user_id
          : undefined,
      organization_id:
        props.body.organization_id !== undefined &&
        props.body.organization_id !== null
          ? props.body.organization_id
          : undefined,
      delivered_at:
        props.body.delivered_at !== undefined &&
        props.body.delivered_at !== null
          ? toISOStringSafe(props.body.delivered_at)
          : undefined,
      acknowledged_at:
        props.body.acknowledged_at !== undefined &&
        props.body.acknowledged_at !== null
          ? toISOStringSafe(props.body.acknowledged_at)
          : undefined,
      snoozed_until:
        props.body.snoozed_until !== undefined &&
        props.body.snoozed_until !== null
          ? toISOStringSafe(props.body.snoozed_until)
          : undefined,
      failure_reason:
        props.body.failure_reason !== undefined &&
        props.body.failure_reason !== null
          ? props.body.failure_reason
          : undefined,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    target_user_id:
      created.target_user_id === null ? undefined : created.target_user_id,
    organization_id:
      created.organization_id === null ? undefined : created.organization_id,
    reminder_type: created.reminder_type,
    reminder_message: created.reminder_message,
    scheduled_for: toISOStringSafe(created.scheduled_for),
    status: created.status,
    delivered_at:
      created.delivered_at === null
        ? undefined
        : toISOStringSafe(created.delivered_at),
    acknowledged_at:
      created.acknowledged_at === null
        ? undefined
        : toISOStringSafe(created.acknowledged_at),
    snoozed_until:
      created.snoozed_until === null
        ? undefined
        : toISOStringSafe(created.snoozed_until),
    failure_reason:
      created.failure_reason === null ? undefined : created.failure_reason,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
