import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * Delete a specific Workflow Node from a Workflow.
 *
 * This operation verifies that the node exists and belongs to the specified
 * workflow. It ensures there are no active trigger instances referencing this
 * node. If constrained by active triggers, deletion is prevented.
 *
 * Only authorized users with roles 'workflowManager' or 'systemAdmin' may
 * perform this.
 *
 * @param props - The props containing the workflow manager payload, workflow
 *   ID, and workflow node ID.
 * @throws {Error} When the node is not found, does not belong to the workflow,
 *   or has active dependent triggers.
 */
export async function deletenotificationWorkflowWorkflowManagerWorkflowsWorkflowIdWorkflowNodesWorkflowNodeId(props: {
  workflowManager: WorkflowmanagerPayload;
  workflowId: string & tags.Format<"uuid">;
  workflowNodeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { workflowManager, workflowId, workflowNodeId } = props;

  // Verify the workflow node exists and belongs to the specified workflow
  const workflowNode =
    await MyGlobal.prisma.notification_workflow_workflow_nodes.findUnique({
      where: { id: workflowNodeId },
    });

  if (!workflowNode) throw new Error("Workflow node not found");
  if (workflowNode.workflow_id !== workflowId)
    throw new Error("Node does not belong to the specified workflow");

  // Check if any active trigger instances depend on this node
  const activeStatuses = ["enqueued", "processing"];

  const dependentTrigger =
    await MyGlobal.prisma.notification_workflow_trigger_instances.findFirst({
      where: {
        cursor_current_node_id: workflowNodeId,
        status: { in: activeStatuses },
      },
    });

  if (dependentTrigger)
    throw new Error(
      "Cannot delete node with active trigger instances depending on it",
    );

  // Proceed with hard delete
  await MyGlobal.prisma.notification_workflow_workflow_nodes.delete({
    where: { id: workflowNodeId },
  });
}
