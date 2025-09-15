import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowManager } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowManager";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Get detailed info on a workflow manager user
 *
 * This operation retrieves comprehensive details of a specific workflow manager
 * user by their unique identifier. It includes email and audit timestamps but
 * excludes exposing passwords outside the context.
 *
 * Access restricted to users with systemAdmin role for privacy and compliance.
 *
 * @param props - Contains systemAdmin authentication info and the target user
 *   ID
 * @param props.systemAdmin - The authenticated systemAdmin user executing this
 *   operation
 * @param props.id - Unique UUID of the target workflow manager user
 * @returns Detailed workflow manager user information
 * @throws {Error} If no workflow manager with the specified ID exists
 */
export async function getnotificationWorkflowSystemAdminWorkflowManagersId(props: {
  systemAdmin: SystemAdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<INotificationWorkflowWorkflowManager> {
  const { systemAdmin, id } = props;

  const manager =
    await MyGlobal.prisma.notification_workflow_workflowmanagers.findUniqueOrThrow(
      {
        where: { id },
        select: {
          id: true,
          email: true,
          password_hash: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );

  return {
    id: manager.id,
    email: manager.email,
    password_hash: manager.password_hash,
    created_at: toISOStringSafe(manager.created_at),
    updated_at: toISOStringSafe(manager.updated_at),
    deleted_at: manager.deleted_at ? toISOStringSafe(manager.deleted_at) : null,
  };
}
