import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Retrieve the notification preference record for a specific QA user by
 * preference ID.
 *
 * This endpoint fetches a notification preference by its unique ID.
 * Authorization is enforced to allow only the owner (QA user) to access the
 * record.
 *
 * @param props - Input properties including authenticated QA user and
 *   notification preference ID
 * @param props.qa - The authenticated QA user payload
 * @param props.id - The UUID of the notification preference to retrieve
 * @returns The notification preference record matching the ID
 * @throws {Error} When the preference is not found (throws by Prisma)
 * @throws {Error} When the preference does not belong to the authenticated QA
 *   user
 */
export async function gettaskManagementQaNotificationPreferencesId(props: {
  qa: QaPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementNotificationPreferences> {
  const { qa, id } = props;

  const preference =
    await MyGlobal.prisma.task_management_notification_preferences.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  if (preference.user_id !== qa.id) {
    throw new Error(
      "Forbidden: You can only access your own notification preferences",
    );
  }

  return {
    id: preference.id,
    user_id: preference.user_id,
    preference_key: preference.preference_key,
    enabled: preference.enabled,
    delivery_method: preference.delivery_method,
    created_at: toISOStringSafe(preference.created_at),
    updated_at: toISOStringSafe(preference.updated_at),
    deleted_at: preference.deleted_at
      ? toISOStringSafe(preference.deleted_at)
      : null,
  };
}
