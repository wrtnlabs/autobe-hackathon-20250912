import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Retrieve the notification preference record for given ID.
 *
 * This function fetches the notification preference by its unique identifier
 * from the database, ensuring that the requesting PM user owns the preference.
 * It converts date fields to ISO string format and returns the preference
 * data.
 *
 * @param props - Request properties
 * @param props.pm - Authenticated PM user payload
 * @param props.id - UUID of the notification preference to retrieve
 * @returns The notification preference record matching the ID
 * @throws {Error} When the notification preference does not exist or access is
 *   unauthorized
 */
export async function gettaskManagementPmNotificationPreferencesId(props: {
  pm: PmPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementNotificationPreferences> {
  const { pm, id } = props;
  const record =
    await MyGlobal.prisma.task_management_notification_preferences.findUnique({
      where: { id },
    });

  if (!record) {
    throw new Error("Notification preference not found");
  }

  if (record.user_id !== pm.id) {
    throw new Error("Unauthorized access to notification preference");
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
