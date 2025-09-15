import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Updates a notification preference record for a designer user by its unique
 * ID.
 *
 * This function ensures that only the owner designer can update their
 * notification preferences. It updates provided fields like preference key,
 * enabled status, and delivery method.
 *
 * @param props - Object containing the authenticated designer, the preference
 *   ID, and the update data.
 * @param props.designer - Authenticated designer's payload for authorization.
 * @param props.id - UUID of the notification preference to update.
 * @param props.body - Partial update data for the notification preference.
 * @returns The updated notification preference record with all fields.
 * @throws {Error} Throws if no matching preference record is found or
 *   unauthorized.
 */
export async function puttaskManagementDesignerNotificationPreferencesId(props: {
  designer: DesignerPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementNotificationPreferences.IUpdate;
}): Promise<ITaskManagementNotificationPreferences> {
  const { designer, id, body } = props;

  // Verify ownership and existence
  await MyGlobal.prisma.task_management_notification_preferences.findFirstOrThrow(
    {
      where: {
        id,
        user_id: designer.id,
        deleted_at: null,
      },
    },
  );

  // Update the record with provided fields
  const updated =
    await MyGlobal.prisma.task_management_notification_preferences.update({
      where: { id },
      data: {
        preference_key: body.preference_key ?? undefined,
        enabled: body.enabled ?? undefined,
        delivery_method: body.delivery_method ?? undefined,
      },
    });

  // Return with proper date conversions
  return {
    id: updated.id,
    user_id: updated.user_id,
    preference_key: updated.preference_key,
    enabled: updated.enabled,
    delivery_method: updated.delivery_method,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
