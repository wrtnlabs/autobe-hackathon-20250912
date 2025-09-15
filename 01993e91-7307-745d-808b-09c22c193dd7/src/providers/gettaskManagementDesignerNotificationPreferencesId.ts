import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Retrieve notification preference detail by ID
 *
 * This operation fetches the notification preference record for a given ID,
 * ensuring it belongs to the authenticated designer user and is not soft
 * deleted. Authorized users with the designer role can access their own
 * preferences only.
 *
 * @param props - Request properties
 * @param props.designer - Authenticated designer user payload
 * @param props.id - Unique identifier of the notification preference
 * @returns The notification preference record matching the given ID
 * @throws {Error} If the notification preference is not found or unauthorized
 */
export async function gettaskManagementDesignerNotificationPreferencesId(props: {
  designer: DesignerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementNotificationPreferences> {
  const { designer, id } = props;

  const record =
    await MyGlobal.prisma.task_management_notification_preferences.findFirstOrThrow(
      {
        where: {
          id,
          user_id: designer.id,
          deleted_at: null,
        },
        select: {
          id: true,
          user_id: true,
          preference_key: true,
          enabled: true,
          delivery_method: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );

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
