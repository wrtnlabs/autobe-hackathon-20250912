import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Retrieve the notification preference record by its unique ID for an
 * authenticated developer.
 *
 * This function ensures that only the owner developer with matching `user_id`
 * can access the notification preference.
 *
 * @param props - Object containing:
 *
 *   - Developer: The authenticated developer payload with id
 *   - Id: The UUID of the notification preference record to retrieve
 *
 * @returns The notification preference record conforming to
 *   ITaskManagementNotificationPreferences
 * @throws {Error} When the notification preference is not found or does not
 *   belong to the developer
 */
export async function gettaskManagementDeveloperNotificationPreferencesId(props: {
  developer: DeveloperPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementNotificationPreferences> {
  const { developer, id } = props;

  const record =
    await MyGlobal.prisma.task_management_notification_preferences.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  if (record.user_id !== developer.id) {
    throw new Error(
      "Unauthorized: This notification preference does not belong to the developer",
    );
  }

  return {
    id: record.id,
    user_id: record.user_id,
    preference_key: record.preference_key,
    enabled: record.enabled,
    delivery_method: record.delivery_method,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
