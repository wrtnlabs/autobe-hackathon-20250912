import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Create a new scheduled reminder for user or staff
 *
 * This endpoint creates a new scheduled reminder record in the
 * healthcare_platform_reminders table. The reminder is linked to a patient or
 * user (by target_user_id) and stores the type, schedule, message, and delivery
 * metadata. This implementation enforces only recipient existence as
 * org-linking is unsupported by schema.
 *
 * @param props - Request properties
 * @param props.receptionist - Authenticated receptionist making this request
 *   (payload)
 * @param props.body - Data to create a reminder (reminder_type, message,
 *   scheduled_for, etc)
 * @returns The created reminder entry as stored and returned by the system
 * @throws {Error} If the target_user_id is not a valid patient
 * @throws {Error} If scheduled_for is in the past
 */
export async function posthealthcarePlatformReceptionistReminders(props: {
  receptionist: ReceptionistPayload;
  body: IHealthcarePlatformReminder.ICreate;
}): Promise<IHealthcarePlatformReminder> {
  const { receptionist, body } = props;

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Validate scheduled_for is in the future
  if (body.scheduled_for <= now) {
    throw new Error("scheduled_for must be in the future");
  }

  // Validate receptionist is active (auth constraint)
  const receptionistRecord =
    await MyGlobal.prisma.healthcare_platform_receptionists.findFirst({
      where: { id: receptionist.id, deleted_at: null },
    });
  if (!receptionistRecord) {
    throw new Error("Receptionist not found or inactive");
  }

  // If target_user_id is specified, validate existence
  if (body.target_user_id !== undefined && body.target_user_id !== null) {
    const patient =
      await MyGlobal.prisma.healthcare_platform_patients.findFirst({
        where: {
          id: body.target_user_id,
          deleted_at: null,
        },
      });
    if (!patient) {
      throw new Error(
        "Target user must be a valid patient (in any organization)",
      );
    }
  }

  // Determine status
  const status: string = body.status ?? "pending";

  // Create reminder
  const id: string & tags.Format<"uuid"> = v4();
  const created = await MyGlobal.prisma.healthcare_platform_reminders.create({
    data: {
      id,
      reminder_type: body.reminder_type,
      reminder_message: body.reminder_message,
      scheduled_for: body.scheduled_for,
      status,
      target_user_id: body.target_user_id ?? undefined,
      organization_id: body.organization_id ?? undefined,
      delivered_at: body.delivered_at ?? undefined,
      acknowledged_at: body.acknowledged_at ?? undefined,
      snoozed_until: body.snoozed_until ?? undefined,
      failure_reason: body.failure_reason ?? undefined,
      created_at: now,
      updated_at: now,
      deleted_at: undefined,
    },
  });

  // Return as IHealthcarePlatformReminder
  return {
    id: created.id,
    target_user_id: created.target_user_id ?? undefined,
    organization_id: created.organization_id ?? undefined,
    reminder_type: created.reminder_type,
    reminder_message: created.reminder_message,
    scheduled_for: toISOStringSafe(created.scheduled_for),
    status: created.status,
    delivered_at: created.delivered_at
      ? toISOStringSafe(created.delivered_at)
      : undefined,
    acknowledged_at: created.acknowledged_at
      ? toISOStringSafe(created.acknowledged_at)
      : undefined,
    snoozed_until: created.snoozed_until
      ? toISOStringSafe(created.snoozed_until)
      : undefined,
    failure_reason: created.failure_reason ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: created.updated_at
      ? toISOStringSafe(created.updated_at)
      : undefined,
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
