import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Retrieve the notification preference record for the given ID.
 *
 * This endpoint allows PMO users to securely view their specific notification
 * preferences. Authorization is enforced by verifying that the preference
 * belongs to the requesting PMO user.
 *
 * @param props - Object containing the PMO user's authentication and the
 *   notification preference ID
 * @param props.pmo - Authenticated PMO user payload
 * @param props.id - UUID of the notification preference to retrieve
 * @returns The notification preference record matching the ID
 * @throws {Error} When the notification preference is not found
 * @throws {Error} When the authenticated PMO user does not own the preference
 */
export async function gettaskManagementPmoNotificationPreferencesId(props: {
  pmo: PmoPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementNotificationPreferences> {
  const { pmo, id } = props;
  const record =
    await MyGlobal.prisma.task_management_notification_preferences.findUnique({
      where: { id },
    });
  if (!record) throw new Error("Notification preference not found");
  if (record.user_id !== pmo.id) throw new Error("Unauthorized: Access denied");

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
