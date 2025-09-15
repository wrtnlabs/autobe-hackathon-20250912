import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Create a new scheduled reminder for user or staff
 *
 * Creates a new scheduled reminder in the healthcarePlatform system for a user
 * or staff member. Saves to the healthcare_platform_reminders table, supporting
 * notifications for compliance, appointments, or workflow events. All
 * organizational and role access, audit, and business rules are enforced
 * upstream; this provider requires a MedicaldoctorPayload for authenticated
 * invocation.
 *
 * @param props.medicalDoctor - Authenticated MedicaldoctorPayload issuing the
 *   reminder creation. Must be a valid, active medical doctor.
 * @param props.body - The request data with reminder details (type, message,
 *   recipient, schedule, and delivery metadata).
 * @returns The complete created reminder record, with all metadata/fields as
 *   stored in the system.
 * @throws {Error} If the database operation fails or the required fields are
 *   not present (should be enforced by controller).
 */
export async function posthealthcarePlatformMedicalDoctorReminders(props: {
  medicalDoctor: MedicaldoctorPayload;
  body: IHealthcarePlatformReminder.ICreate;
}): Promise<IHealthcarePlatformReminder> {
  const { body } = props;
  const now = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();
  const created = await MyGlobal.prisma.healthcare_platform_reminders.create({
    data: {
      id,
      reminder_type: body.reminder_type,
      reminder_message: body.reminder_message,
      scheduled_for: toISOStringSafe(body.scheduled_for),
      target_user_id: body.target_user_id ?? undefined,
      organization_id: body.organization_id ?? undefined,
      status: body.status ?? "pending",
      delivered_at: body.delivered_at
        ? toISOStringSafe(body.delivered_at)
        : undefined,
      acknowledged_at: body.acknowledged_at
        ? toISOStringSafe(body.acknowledged_at)
        : undefined,
      snoozed_until: body.snoozed_until
        ? toISOStringSafe(body.snoozed_until)
        : undefined,
      failure_reason: body.failure_reason ?? undefined,
      created_at: now,
      updated_at: now,
      deleted_at: undefined,
    },
  });
  return {
    id: created.id,
    reminder_type: created.reminder_type,
    reminder_message: created.reminder_message,
    scheduled_for: toISOStringSafe(created.scheduled_for),
    target_user_id: created.target_user_id ?? undefined,
    organization_id: created.organization_id ?? undefined,
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
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
