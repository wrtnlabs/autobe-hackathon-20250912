import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Create a new scheduled reminder for user or staff.
 *
 * This endpoint allows a patient to schedule a reminder for themselves
 * (medication or appointment). Only future times are accepted. All required
 * fields are properly validated. Returned reminder meets all strict DTO rules:
 * no Date types, correct branding for UUID/date-time, no type assertions used.
 *
 * @param props - The operation props
 * @param props.patient - The authenticated patient creating the reminder
 * @param props.body - The DTO for creating the reminder (type, message,
 *   schedule, etc)
 * @returns The created reminder row as an IHealthcarePlatformReminder
 * @throws Error if reminder_type is invalid, scheduled_for is in the past, or
 *   the patient tries to schedule a reminder for another user
 */
export async function posthealthcarePlatformPatientReminders(props: {
  patient: PatientPayload;
  body: IHealthcarePlatformReminder.ICreate;
}): Promise<IHealthcarePlatformReminder> {
  const { patient, body } = props;

  // Allowed types for patients
  const allowedTypes = ["medication", "appointment"];
  if (!allowedTypes.includes(body.reminder_type)) {
    throw new Error(
      "Invalid reminder_type: only 'medication' and 'appointment' are permitted for self-reminders",
    );
  }

  // Check scheduled_for is a valid ISO date-time after now (strict)
  const now = toISOStringSafe(new Date());
  if (body.scheduled_for <= now) {
    throw new Error("scheduled_for must be in the future");
  }

  // Ensure target_user_id is either unset or matches self
  if (
    body.target_user_id !== undefined &&
    body.target_user_id !== null &&
    body.target_user_id !== patient.id
  ) {
    throw new Error("Patients may only schedule reminders for themselves");
  }

  // Prepare IDs and timestamps
  const id: string & tags.Format<"uuid"> = v4();
  const created_at: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const updated_at: string & tags.Format<"date-time"> = created_at;

  // Create reminder in DB
  const created = await MyGlobal.prisma.healthcare_platform_reminders.create({
    data: {
      id: id,
      target_user_id: patient.id,
      organization_id: body.organization_id ?? undefined,
      reminder_type: body.reminder_type,
      reminder_message: body.reminder_message,
      scheduled_for: body.scheduled_for,
      status: "pending",
      delivered_at: body.delivered_at ?? undefined,
      acknowledged_at: body.acknowledged_at ?? undefined,
      snoozed_until: body.snoozed_until ?? undefined,
      failure_reason: body.failure_reason ?? undefined,
      created_at,
      updated_at,
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

  // Map output to DTO, strictly typing/formatting all fields
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
