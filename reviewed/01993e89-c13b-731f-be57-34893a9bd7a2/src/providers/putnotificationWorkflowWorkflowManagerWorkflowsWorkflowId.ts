import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflow } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflow";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * Update an existing notification workflow by ID.
 *
 * This function updates the specified notification workflow's properties based
 * on the provided update data. It also updates the timestamp for modification
 * and handles soft deletion if requested.
 *
 * Authorization is enforced by presence of workflowManager payload.
 *
 * @param props - Request properties including authentication, workflow ID, and
 *   update body
 * @param props.workflowManager - Authenticated workflow manager performing the
 *   update
 * @param props.workflowId - UUID of the workflow to update
 * @param props.body - Partial update data for the notification workflow
 * @returns The updated notification workflow entity with all fields
 * @throws {Error} When the workflow with specified ID does not exist
 */
export async function putnotificationWorkflowWorkflowManagerWorkflowsWorkflowId(props: {
  workflowManager: WorkflowmanagerPayload;
  workflowId: string & tags.Format<"uuid">;
  body: INotificationWorkflowWorkflow.IUpdate;
}): Promise<INotificationWorkflowWorkflow> {
  const { workflowManager, workflowId, body } = props;

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.notification_workflow_workflows.update({
    where: { id: workflowId },
    data: {
      code: body.code ?? undefined,
      name: body.name ?? undefined,
      is_active: body.is_active ?? undefined,
      entry_node_id: body.entry_node_id ?? undefined,
      version: body.version ?? undefined,
      deleted_at:
        body.deleted_at === null ? null : (body.deleted_at ?? undefined),
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    is_active: updated.is_active,
    entry_node_id: updated.entry_node_id,
    version: updated.version,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
