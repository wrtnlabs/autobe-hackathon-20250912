import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * Update details of an existing workflow manager user using their UUID.
 *
 * Only authorized roles such as systemAdmin and workflowManager can perform
 * this update. Password hash changes are not allowed via this endpoint for
 * security. Updates are versioned with timestamps.
 *
 * @param props - Object containing workflowManager authorization payload, user
 *   UUID, and update body
 * @param props.workflowManager - The authenticated workflowManager performing
 *   the update
 * @param props.id - UUID of the workflow manager user to update
 * @param props.body - Update body containing fields to modify (email,
 *   deleted_at)
 * @returns Updated workflow manager user information
 * @throws Error if workflow manager not found
 */
export async function putnotificationWorkflowWorkflowManagerWorkflowManagersId(props: {
  workflowManager: WorkflowmanagerPayload;
  id: string & tags.Format<"uuid">;
  body: INotificationWorkflowWorkflowManager.IUpdate;
}): Promise<INotificationWorkflowWorkflowManager> {
  const { workflowManager, id, body } = props;

  const existing =
    await MyGlobal.prisma.notification_workflow_workflowmanagers.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  const updated =
    await MyGlobal.prisma.notification_workflow_workflowmanagers.update({
      where: { id },
      data: {
        email: body.email ?? undefined,
        deleted_at: body.deleted_at ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    created_at: toISOStringSafe(existing.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ?? null,
  };
}
