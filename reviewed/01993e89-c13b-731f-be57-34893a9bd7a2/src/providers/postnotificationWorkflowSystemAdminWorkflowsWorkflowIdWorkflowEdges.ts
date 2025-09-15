import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowEdge } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowEdge";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Create a new workflow edge linking two nodes within the specified workflow.
 *
 * This operation requires system admin authorization. It ensures no self loops
 * and verifies that both nodes belong to the workflow.
 *
 * @param props - Object containing systemAdmin payload, workflowId, and body
 *   with from_node_id and to_node_id
 * @returns The newly created workflow edge record
 * @throws {Error} When attempting to create self-loop edge
 * @throws {Error} When from_node_id or to_node_id do not belong to the workflow
 */
export async function postnotificationWorkflowSystemAdminWorkflowsWorkflowIdWorkflowEdges(props: {
  systemAdmin: SystemAdminPayload;
  workflowId: string & tags.Format<"uuid">;
  body: INotificationWorkflowWorkflowEdge.ICreate;
}): Promise<INotificationWorkflowWorkflowEdge> {
  const { systemAdmin, workflowId, body } = props;

  // Prevent self loop edge
  if (body.from_node_id === body.to_node_id) {
    throw new Error(
      "Cannot create edge with identical from_node_id and to_node_id",
    );
  }

  // Verify from_node_id belongs to workflow
  const fromNode =
    await MyGlobal.prisma.notification_workflow_workflow_nodes.findUnique({
      where: { id: body.from_node_id },
    });

  if (!fromNode || fromNode.workflow_id !== workflowId) {
    throw new Error("from_node_id does not belong to the specified workflow");
  }

  // Verify to_node_id belongs to workflow
  const toNode =
    await MyGlobal.prisma.notification_workflow_workflow_nodes.findUnique({
      where: { id: body.to_node_id },
    });

  if (!toNode || toNode.workflow_id !== workflowId) {
    throw new Error("to_node_id does not belong to the specified workflow");
  }

  // Current ISO timestamp
  const now = toISOStringSafe(new Date());

  // Generate UUID for new edge
  const edgeId = v4() as string & tags.Format<"uuid">;

  // Create the edge record
  const created =
    await MyGlobal.prisma.notification_workflow_workflow_edges.create({
      data: {
        id: edgeId,
        workflow_id: workflowId,
        from_node_id: body.from_node_id,
        to_node_id: body.to_node_id,
        created_at: now,
        updated_at: now,
      },
    });

  // Return created edge with proper date conversions
  return {
    id: created.id,
    workflow_id: created.workflow_id,
    from_node_id: created.from_node_id,
    to_node_id: created.to_node_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
