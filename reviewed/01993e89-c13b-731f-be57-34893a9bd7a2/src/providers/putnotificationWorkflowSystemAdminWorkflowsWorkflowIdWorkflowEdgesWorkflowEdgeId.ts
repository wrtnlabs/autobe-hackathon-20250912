import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowEdge } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowEdge";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Update workflow edge connecting nodes
 *
 * This operation updates the properties of an existing workflow edge identified
 * by workflowEdgeId in the specified workflow. It modifies the connections
 * between nodes, ensuring no cycles or self-loops are introduced and that the
 * referenced nodes belong to the workflow.
 *
 * @param props - The properties for the update operation
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.workflowId - UUID of the workflow
 * @param props.workflowEdgeId - UUID of the workflow edge to update
 * @param props.body - Partial update data for the workflow edge
 * @returns The updated workflow edge with all timestamp fields in ISO string
 *   format
 * @throws {Error} When the edge does not exist
 * @throws {Error} When the edge does not belong to the specified workflow
 * @throws {Error} When from_node_id or to_node_id is invalid or causes
 *   self-loop
 */
export async function putnotificationWorkflowSystemAdminWorkflowsWorkflowIdWorkflowEdgesWorkflowEdgeId(props: {
  systemAdmin: SystemAdminPayload;
  workflowId: string & tags.Format<"uuid">;
  workflowEdgeId: string & tags.Format<"uuid">;
  body: INotificationWorkflowWorkflowEdge.IUpdate;
}): Promise<INotificationWorkflowWorkflowEdge> {
  const { systemAdmin, workflowId, workflowEdgeId, body } = props;

  const edge =
    await MyGlobal.prisma.notification_workflow_workflow_edges.findUnique({
      where: { id: workflowEdgeId },
    });
  if (!edge)
    throw new Error(`Workflow edge not found with id: ${workflowEdgeId}`);

  if (edge.workflow_id !== workflowId) {
    throw new Error(`Workflow edge does not belong to workflow: ${workflowId}`);
  }

  if (body.from_node_id !== undefined && body.to_node_id !== undefined) {
    if (body.from_node_id === body.to_node_id) {
      throw new Error(
        "Self-loop edge detected: from_node_id and to_node_id cannot be the same",
      );
    }
  }

  if (body.from_node_id !== undefined) {
    const fromNode =
      await MyGlobal.prisma.notification_workflow_workflow_nodes.findFirst({
        where: { id: body.from_node_id, workflow_id: workflowId },
      });
    if (!fromNode) {
      throw new Error(
        `from_node_id does not exist or does not belong to workflow: ${body.from_node_id}`,
      );
    }
  }

  if (body.to_node_id !== undefined) {
    const toNode =
      await MyGlobal.prisma.notification_workflow_workflow_nodes.findFirst({
        where: { id: body.to_node_id, workflow_id: workflowId },
      });
    if (!toNode) {
      throw new Error(
        `to_node_id does not exist or does not belong to workflow: ${body.to_node_id}`,
      );
    }
  }

  const updatedEdge =
    await MyGlobal.prisma.notification_workflow_workflow_edges.update({
      where: { id: workflowEdgeId },
      data: {
        ...(body.workflow_id !== undefined && {
          workflow_id: body.workflow_id,
        }),
        ...(body.from_node_id !== undefined && {
          from_node_id: body.from_node_id,
        }),
        ...(body.to_node_id !== undefined && { to_node_id: body.to_node_id }),
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: updatedEdge.id,
    workflow_id: updatedEdge.workflow_id,
    from_node_id: updatedEdge.from_node_id,
    to_node_id: updatedEdge.to_node_id,
    created_at: toISOStringSafe(updatedEdge.created_at),
    updated_at: toISOStringSafe(updatedEdge.updated_at),
    deleted_at:
      updatedEdge.deleted_at === null
        ? null
        : updatedEdge.deleted_at
          ? toISOStringSafe(updatedEdge.deleted_at)
          : undefined,
  };
}
