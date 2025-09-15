import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Update workflow manager user information
 *
 * Updates the email and soft deletion timestamp (deleted_at) of an existing
 * workflow manager identified by UUID. Automatically updates the updated_at
 * timestamp to the current time. Password hash updates are NOT allowed in this
 * operation.
 *
 * @param props - Parameters including systemAdmin auth payload, UUID, and
 *   update body
 * @param props.systemAdmin - Authenticated system admin performing the update
 * @param props.id - UUID of the workflow manager to update
 * @param props.body - Update data containing optional email and deleted_at
 * @returns The updated workflow manager record
 * @throws {Error} If the workflow manager record does not exist
 */
export async function putnotificationWorkflowSystemAdminWorkflowManagersId(props: {
  systemAdmin: SystemAdminPayload;
  id: string & tags.Format<"uuid">;
  body: INotificationWorkflowWorkflowManager.IUpdate;
}): Promise<INotificationWorkflowWorkflowManager> {
  const { systemAdmin, id, body } = props;

  // Fetch existing workflow manager user
  const existing =
    await MyGlobal.prisma.notification_workflow_workflowmanagers.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  // Current timestamp for updated_at
  const updatedAt = toISOStringSafe(new Date());

  // Update only allowed fields; exclude password_hash
  const updated =
    await MyGlobal.prisma.notification_workflow_workflowmanagers.update({
      where: { id },
      data: {
        email: body.email ?? existing.email,
        deleted_at:
          body.deleted_at === null
            ? null
            : (body.deleted_at ?? existing.deleted_at),
        updated_at: updatedAt,
      },
    });

  // Return updated workflow manager with converted date fields
  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: updatedAt,
    deleted_at:
      updated.deleted_at === null ? null : (updated.deleted_at ?? null),
  };
}
