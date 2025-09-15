import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Deletes a specific reminder setting permanently for a user's subscription.
 *
 * This operation verifies that the reminder setting exists and belongs to the
 * authenticated user,
 *
 * Then performs a hard delete to remove the reminder setting from the database.
 *
 * @param props - Object containing the authenticated user, subscription ID, and
 *   reminder setting ID.
 * @param props.user - Authenticated user performing the deletion.
 * @param props.subscriptionId - UUID of the subscription to which the reminder
 *   belongs.
 * @param props.reminderSettingId - UUID of the reminder setting to delete.
 * @throws {Error} When the reminder setting doesn't exist or doesn't belong to
 *   the user (404).
 * @throws {Error} When the user is not authorized to perform this operation
 *   (401).
 */
export async function deletesubscriptionRenewalGuardianUserSubscriptionsSubscriptionIdReminderSettingsReminderSettingId(props: {
  user: UserPayload;
  subscriptionId: string & tags.Format<"uuid">;
  reminderSettingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, subscriptionId, reminderSettingId } = props;

  const reminderSetting =
    await MyGlobal.prisma.subscription_renewal_guardian_reminder_settings.findFirst(
      {
        where: {
          id: reminderSettingId,
          subscription_id: subscriptionId,
        },
        include: {
          subscription: true,
        },
      },
    );

  if (!reminderSetting) {
    throw new Error("Reminder setting not found");
  }

  if (reminderSetting.subscription.user_id !== user.id) {
    throw new Error(
      "Unauthorized: Only subscription owner can delete reminder settings",
    );
  }

  await MyGlobal.prisma.subscription_renewal_guardian_reminder_settings.delete({
    where: {
      id: reminderSettingId,
    },
  });
}
