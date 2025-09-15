import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Update an existing notification workflow by ID.
 *
 * This operation updates the properties of the notification workflow, including
 * code, name, active status, entry node ID, versioning, and soft deletion
 * timestamp. It retrieves the current workflow from the database, increments
 * the version number if not provided, and updates the updated_at timestamp to
 * the current time.
 *
 * Authorization: This operation requires a systemAdmin role which is validated
 * externally.
 *
 * @param props - Object containing the systemAdmin payload, workflow ID, and
 *   update data
 * @param props.systemAdmin - Authenticated systemAdmin performing the update
 * @param props.workflowId - UUID of the notification workflow to update
 * @param props.body - Partial update data for the workflow
 * @returns The updated notification workflow entity
 * @throws {Error} If the workflow with the specified ID does not exist
 */
export async function putnotificationWorkflowSystemAdminWorkflowsWorkflowId(props: {
  systemAdmin: SystemAdminPayload;
  workflowId: string & tags.Format<"uuid">;
  body: INotificationWorkflowWorkflow.IUpdate;
}): Promise<INotificationWorkflowWorkflow> {
  const { systemAdmin, workflowId, body } = props;

  const existingWorkflow =
    await MyGlobal.prisma.notification_workflow_workflows.findUniqueOrThrow({
      where: { id: workflowId },
    });

  const now = toISOStringSafe(new Date());

  const newVersion =
    body.version !== undefined ? body.version : existingWorkflow.version + 1;

  const updatedWorkflow =
    await MyGlobal.prisma.notification_workflow_workflows.update({
      where: { id: workflowId },
      data: {
        code: body.code ?? undefined,
        name: body.name ?? undefined,
        is_active: body.is_active ?? undefined,
        entry_node_id: body.entry_node_id ?? undefined,
        version: newVersion,
        updated_at: now,
        deleted_at: body.deleted_at ?? undefined,
      },
    });

  return {
    id: updatedWorkflow.id,
    code: updatedWorkflow.code,
    name: updatedWorkflow.name,
    is_active: updatedWorkflow.is_active,
    entry_node_id: updatedWorkflow.entry_node_id,
    version: updatedWorkflow.version,
    created_at: toISOStringSafe(updatedWorkflow.created_at),
    updated_at: toISOStringSafe(updatedWorkflow.updated_at),
    deleted_at: updatedWorkflow.deleted_at
      ? toISOStringSafe(updatedWorkflow.deleted_at)
      : null,
  };
}
