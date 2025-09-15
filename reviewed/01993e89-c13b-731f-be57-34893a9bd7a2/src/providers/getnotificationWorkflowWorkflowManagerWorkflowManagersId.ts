import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * Get detailed info on a workflow manager user.
 *
 * Retrieves comprehensive details of a specific workflow manager user by their
 * unique identifier. Access is restricted to authorized workflowManager or
 * systemAdmin roles. Sensitive information such as password hashes is excluded
 * from response.
 *
 * @param props - Object containing the workflowManager payload and user id
 * @param props.workflowManager - The authenticated workflow manager making the
 *   request
 * @param props.id - Unique UUID of the target workflow manager user
 * @returns Detailed workflow manager user information
 * @throws {Error} When the workflow manager user is not found
 */
export async function getnotificationWorkflowWorkflowManagerWorkflowManagersId(props: {
  workflowManager: WorkflowmanagerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<INotificationWorkflowWorkflowManager> {
  const { workflowManager, id } = props;

  const record =
    await MyGlobal.prisma.notification_workflow_workflowmanagers.findFirstOrThrow(
      {
        where: { id, deleted_at: null },
      },
    );

  return {
    id: record.id,
    email: record.email,
    password_hash: record.password_hash,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ?? null,
  };
}
