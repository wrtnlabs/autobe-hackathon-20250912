import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Delete a specific Workflow Node from a Workflow by its ID.
 *
 * This function ensures that the authenticated system administrator exists and
 * verifies that the node belongs to the specified workflow. It prevents
 * deletion if active triggers depend on the node. The delete operation is a
 * hard delete, permanently removing the node from the database.
 *
 * @param props - Object containing the system administrator payload and the
 *   workflow and node identifiers.
 * @param props.systemAdmin - The authenticated system administrator.
 * @param props.workflowId - UUID of the workflow containing the node.
 * @param props.workflowNodeId - UUID of the node to be deleted.
 * @throws {Error} When the system administrator is unauthorized or inactive.
 * @throws {Error} When the node does not exist or does not belong to the
 *   workflow.
 * @throws {Error} When active triggers depend on the node preventing deletion.
 */
export async function deletenotificationWorkflowSystemAdminWorkflowsWorkflowIdWorkflowNodesWorkflowNodeId(props: {
  systemAdmin: SystemAdminPayload;
  workflowId: string & tags.Format<"uuid">;
  workflowNodeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, workflowId, workflowNodeId } = props;

  // Validate systemAdmin existence
  const admin =
    await MyGlobal.prisma.notification_workflow_systemadmins.findFirst({
      where: { id: systemAdmin.id, deleted_at: null },
      select: { id: true },
    });
  if (!admin)
    throw new Error("Unauthorized: System admin not found or inactive");

  // Check if the workflow node exists and belongs to the workflow
  const node =
    await MyGlobal.prisma.notification_workflow_workflow_nodes.findFirst({
      where: { id: workflowNodeId, workflow_id: workflowId },
      select: { id: true },
    });

  if (!node)
    throw new Error(
      "Workflow node not found or does not belong to the workflow",
    );

  // Ensure no trigger instances depend on this node (cursor_current_node_id) and are not completed
  const dependentTrigger =
    await MyGlobal.prisma.notification_workflow_trigger_instances.findFirst({
      where: {
        cursor_current_node_id: workflowNodeId,
        status: { not: "completed" },
      },
      select: { id: true },
    });

  if (dependentTrigger)
    throw new Error(
      "Cannot delete workflow node; active triggers depend on this node",
    );

  // Hard delete the workflow node
  await MyGlobal.prisma.notification_workflow_workflow_nodes.delete({
    where: { id: workflowNodeId },
  });
}
