import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Update a notification preference by its unique ID.
 *
 * Allows a QA user to update their notification preference including preference
 * key, enabled status, and delivery method.
 *
 * @param props - Object containing QA user payload, notification preference ID,
 *   and update data
 * @param props.qa - Authenticated QA user performing the update
 * @param props.id - UUID of the notification preference to update
 * @param props.body - Partial update data with preference key, enabled flag,
 *   and delivery method
 * @returns The updated notification preference record with all fields
 * @throws {Error} When the notification preference is not found
 * @throws {Error} When the QA user is not authorized to update this preference
 */
export async function puttaskManagementQaNotificationPreferencesId(props: {
  qa: QaPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementNotificationPreferences.IUpdate;
}): Promise<ITaskManagementNotificationPreferences> {
  const { qa, id, body } = props;

  // Fetch the existing notification preference
  const existing =
    await MyGlobal.prisma.task_management_notification_preferences.findUnique({
      where: { id },
    });

  if (!existing) {
    throw new Error(`Notification preference not found: ${id}`);
  }

  // Authorization check: the requester must own the preference
  if (existing.user_id !== qa.id) {
    throw new Error("Unauthorized to update this notification preference");
  }

  // Prepare the update data object
  const updateData: Partial<ITaskManagementNotificationPreferences.IUpdate> =
    {};

  if (body.preference_key !== undefined) {
    updateData.preference_key =
      body.preference_key === null ? null : body.preference_key;
  }
  if (body.enabled !== undefined) {
    updateData.enabled = body.enabled;
  }
  if (body.delivery_method !== undefined) {
    updateData.delivery_method = body.delivery_method;
  }

  // Set the updated_at timestamp to the current time
  updateData.updated_at = toISOStringSafe(new Date());

  // Perform the update operation
  const updated =
    await MyGlobal.prisma.task_management_notification_preferences.update({
      where: { id },
      data: updateData,
    });

  // Return the updated record with date fields converted to ISO strings
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
