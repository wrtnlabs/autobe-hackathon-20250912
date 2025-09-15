import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkflowEdge } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkflowEdge";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * Create a new workflow edge linking two nodes within the specified workflow.
 *
 * This operation ensures that the two nodes exist in the workflow, prevents the
 * creation of self-loop edges, and records audit timestamps.
 *
 * @param props - Object containing the workflow manager payload, workflow ID,
 *   and the edge creation data including from_node_id and to_node_id.
 * @returns The newly created workflow edge with all fields populated.
 * @throws {Error} If from_node_id equals to_node_id (self-loop).
 * @throws {Error} If either node does not exist in the workflow.
 */
export async function postnotificationWorkflowWorkflowManagerWorkflowsWorkflowIdWorkflowEdges(props: {
  workflowManager: WorkflowmanagerPayload;
  workflowId: string & tags.Format<"uuid">;
  body: INotificationWorkflowWorkflowEdge.ICreate;
}): Promise<INotificationWorkflowWorkflowEdge> {
  const { workflowManager, workflowId, body } = props;

  if (body.from_node_id === body.to_node_id) {
    throw new Error(
      "Invalid edge: from_node_id and to_node_id cannot be the same.",
    );
  }

  // Verify both nodes exist and belong to the workflow
  const fromNode =
    await MyGlobal.prisma.notification_workflow_workflow_nodes.findFirst({
      where: {
        id: body.from_node_id,
        workflow_id: workflowId,
        deleted_at: null,
      },
    });
  if (!fromNode) {
    throw new Error("from_node_id does not exist in the specified workflow.");
  }

  const toNode =
    await MyGlobal.prisma.notification_workflow_workflow_nodes.findFirst({
      where: { id: body.to_node_id, workflow_id: workflowId, deleted_at: null },
    });
  if (!toNode) {
    throw new Error("to_node_id does not exist in the specified workflow.");
  }

  // Optional cycle check omitted for simplicity

  // Create edge
  const currentTime = toISOStringSafe(new Date());
  const createdEdge =
    await MyGlobal.prisma.notification_workflow_workflow_edges.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        workflow_id: workflowId,
        from_node_id: body.from_node_id,
        to_node_id: body.to_node_id,
        created_at: currentTime,
        updated_at: currentTime,
        deleted_at: null,
      },
    });

  // Return edge converting DateTimes to string & tags.Format<'date-time'>
  return {
    id: createdEdge.id as string & tags.Format<"uuid">,
    workflow_id: createdEdge.workflow_id as string & tags.Format<"uuid">,
    from_node_id: createdEdge.from_node_id as string & tags.Format<"uuid">,
    to_node_id: createdEdge.to_node_id as string & tags.Format<"uuid">,
    created_at: toISOStringSafe(createdEdge.created_at),
    updated_at: toISOStringSafe(createdEdge.updated_at),
    deleted_at: null,
  };
}
