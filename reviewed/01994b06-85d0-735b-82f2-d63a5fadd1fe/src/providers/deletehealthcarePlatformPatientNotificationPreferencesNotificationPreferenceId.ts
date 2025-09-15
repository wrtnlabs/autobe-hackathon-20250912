import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Delete (soft-delete) a notification preference record for a user
 * (healthcare_platform_notification_preferences table).
 *
 * This operation allows a patient to remove their notification preference. The
 * preference entry will not be physically removed; instead, it's soft-deleted
 * by setting its `deleted_at` field. This preserves the historical record for
 * compliance and audit purposes. Only the preference owner (patient) may
 * delete; attempts to delete non-existent or already-deleted preferences result
 * in an error. After deletion, fallback to system or organization defaults for
 * notifications will occur for future communications.
 *
 * @param props - Parameters including authentication context and the
 *   notificationPreferenceId
 * @param props.patient - The authenticated patient payload (ownership and
 *   authorization enforced)
 * @param props.notificationPreferenceId - The unique identifier for the
 *   notification preference record to delete
 * @returns Void
 * @throws {Error} If the notification preference does not exist, has already
 *   been deleted, or does not belong to the patient
 */
export async function deletehealthcarePlatformPatientNotificationPreferencesNotificationPreferenceId(props: {
  patient: PatientPayload;
  notificationPreferenceId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { patient, notificationPreferenceId } = props;

  const preference =
    await MyGlobal.prisma.healthcare_platform_notification_preferences.findFirst(
      {
        where: {
          id: notificationPreferenceId,
          user_id: patient.id,
          deleted_at: null,
        },
      },
    );

  if (!preference) {
    throw new Error(
      "Notification preference not found, already deleted, or does not belong to this user.",
    );
  }

  await MyGlobal.prisma.healthcare_platform_notification_preferences.update({
    where: {
      id: notificationPreferenceId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
