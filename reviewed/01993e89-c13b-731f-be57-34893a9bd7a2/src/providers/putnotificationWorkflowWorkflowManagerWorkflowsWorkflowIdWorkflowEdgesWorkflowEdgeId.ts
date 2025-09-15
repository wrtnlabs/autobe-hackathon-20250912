import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowEdge } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowEdge";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * Update workflow edge connecting nodes
 *
 * This operation updates the from_node_id and/or to_node_id of an existing
 * workflow edge within a specified workflow, ensuring no cycles or self-loops
 * are introduced.
 *
 * @param props - Object containing workflowManager, workflowId, workflowEdgeId,
 *   and the update body
 * @param props.workflowManager - The authorized workflowManager user performing
 *   the operation
 * @param props.workflowId - The UUID of the target workflow
 * @param props.workflowEdgeId - The UUID of the workflow edge being updated
 * @param props.body - Object containing optional fields to update: from_node_id
 *   and/or to_node_id
 * @returns The updated workflow edge
 * @throws Error if validation fails or entity not found
 */
export async function putnotificationWorkflowWorkflowManagerWorkflowsWorkflowIdWorkflowEdgesWorkflowEdgeId(props: {
  workflowManager: WorkflowmanagerPayload;
  workflowId: string & tags.Format<"uuid">;
  workflowEdgeId: string & tags.Format<"uuid">;
  body: INotificationWorkflowWorkflowEdge.IUpdate;
}): Promise<INotificationWorkflowWorkflowEdge> {
  const { workflowManager, workflowId, workflowEdgeId, body } = props;

  // Validate workflow existence
  const workflow =
    await MyGlobal.prisma.notification_workflow_workflows.findUniqueOrThrow({
      where: { id: workflowId },
    });

  // Validate from_node_id if provided
  if (body.from_node_id !== undefined && body.from_node_id !== null) {
    const fromNode =
      await MyGlobal.prisma.notification_workflow_workflow_nodes.findUnique({
        where: { id: body.from_node_id },
      });
    if (!fromNode) throw new Error("Invalid from_node_id: Node not found");
    if (fromNode.workflow_id !== workflowId)
      throw new Error("from_node_id does not belong to the workflow");
  }

  // Validate to_node_id if provided
  if (body.to_node_id !== undefined && body.to_node_id !== null) {
    const toNode =
      await MyGlobal.prisma.notification_workflow_workflow_nodes.findUnique({
        where: { id: body.to_node_id },
      });
    if (!toNode) throw new Error("Invalid to_node_id: Node not found");
    if (toNode.workflow_id !== workflowId)
      throw new Error("to_node_id does not belong to the workflow");
  }

  // Prevent self-loop
  if (
    body.from_node_id !== undefined &&
    body.from_node_id !== null &&
    body.to_node_id !== undefined &&
    body.to_node_id !== null &&
    body.from_node_id === body.to_node_id
  ) {
    throw new Error(
      "Self-loop detected: from_node_id and to_node_id cannot be the same",
    );
  }

  // Validate edge existence
  const edge =
    await MyGlobal.prisma.notification_workflow_workflow_edges.findUniqueOrThrow(
      {
        where: { id: workflowEdgeId },
      },
    );
  if (edge.workflow_id !== workflowId) {
    throw new Error("Edge does not belong to the specified workflow");
  }

  // Perform update
  const now = toISOStringSafe(new Date());
  const data: INotificationWorkflowWorkflowEdge.IUpdate = {
    workflow_id: body.workflow_id ?? undefined,
    from_node_id: body.from_node_id ?? undefined,
    to_node_id: body.to_node_id ?? undefined,
  };
  const updated =
    await MyGlobal.prisma.notification_workflow_workflow_edges.update({
      where: { id: workflowEdgeId },
      data: {
        ...data,
        updated_at: now,
      },
    });

  // Return updated edge
  return {
    id: updated.id,
    workflow_id: updated.workflow_id,
    from_node_id: updated.from_node_id,
    to_node_id: updated.to_node_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
