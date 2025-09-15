import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotificationPreference";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Update a notification preference record for a user
 * (healthcare_platform_notification_preferences table).
 *
 * This operation updates the specified notification preference entry for the
 * authenticated patient. It enforces ownership: only the patient who owns the
 * preference can update it. Attempts to update others are denied. If the
 * provided preference ID does not exist or is soft-deleted, an error is thrown.
 * Only allowed fields (enabled, mute_start, mute_end, escalation_policy) are
 * updatable. All other record columns remain immutable.
 *
 * Date/datetime fields are returned as ISO 8601 strings matching the expected
 * type branding. Null, undefined, or optional fields are handled according to
 * the precise DTO schema (no Date usage, all conventions respected).
 *
 * @param props - Request object containing patient auth payload, target
 *   notification preference ID, and update body.
 * @param props.patient - The authenticated patient payload (must be the owner
 *   of the preference to update)
 * @param props.notificationPreferenceId - The UUID for the notification
 *   preference record to update
 * @param props.body - The update payload (fields: enabled, mute_start,
 *   mute_end, escalation_policy)
 * @returns The updated notification preference record, fully branded
 * @throws {Error} If not found, soft-deleted, or access denied
 */
export async function puthealthcarePlatformPatientNotificationPreferencesNotificationPreferenceId(props: {
  patient: PatientPayload;
  notificationPreferenceId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformNotificationPreference.IUpdate;
}): Promise<IHealthcarePlatformNotificationPreference> {
  // Step 1: Fetch the notification preference and enforce soft-delete/integrity
  const preference =
    await MyGlobal.prisma.healthcare_platform_notification_preferences.findUnique(
      {
        where: { id: props.notificationPreferenceId },
      },
    );
  if (!preference || preference.deleted_at !== null) {
    throw new Error("Notification preference not found");
  }

  // Step 2: Ownership enforcement
  if (preference.user_id !== props.patient.id) {
    throw new Error(
      "You do not have permission to modify this notification preference",
    );
  }

  // Step 3: Prepare update input: only update mutable fields if provided
  const updateInput = {
    ...(typeof props.body.enabled === "boolean" && {
      enabled: props.body.enabled,
    }),
    ...(props.body.mute_start !== undefined && {
      mute_start: props.body.mute_start,
    }),
    ...(props.body.mute_end !== undefined && { mute_end: props.body.mute_end }),
    ...(props.body.escalation_policy !== undefined && {
      escalation_policy: props.body.escalation_policy,
    }),
    updated_at: toISOStringSafe(new Date()),
  };

  const updated =
    await MyGlobal.prisma.healthcare_platform_notification_preferences.update({
      where: { id: props.notificationPreferenceId },
      data: updateInput,
    });

  // Step 4: Structure return using normalized types for all date/optionals
  return {
    id: updated.id,
    user_id: updated.user_id,
    organization_id: updated.organization_id ?? undefined,
    notification_channel: updated.notification_channel,
    notification_type: updated.notification_type,
    enabled: updated.enabled,
    mute_start:
      updated.mute_start !== null && updated.mute_start !== undefined
        ? toISOStringSafe(updated.mute_start)
        : undefined,
    mute_end:
      updated.mute_end !== null && updated.mute_end !== undefined
        ? toISOStringSafe(updated.mute_end)
        : undefined,
    escalation_policy: updated.escalation_policy ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
