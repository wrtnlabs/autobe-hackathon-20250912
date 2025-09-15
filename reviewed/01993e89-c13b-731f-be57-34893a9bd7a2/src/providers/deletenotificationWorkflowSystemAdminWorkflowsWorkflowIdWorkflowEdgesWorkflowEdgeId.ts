import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Deletes a workflow edge permanently from the
 * notification_workflow_workflow_edges table.
 *
 * This operation verifies that the edge identified by workflowEdgeId belongs to
 * the given workflowId. It performs a hard delete and does not support soft
 * delete flag. Access restricted to authorized system administrators.
 *
 * @param props - Object containing systemAdmin payload and identifiers for
 *   workflow and edge.
 * @param props.systemAdmin - The authenticated system administrator performing
 *   the deletion.
 * @param props.workflowId - UUID of the workflow to which the edge belongs.
 * @param props.workflowEdgeId - UUID of the workflow edge to delete.
 * @throws {Error} Throws if the edge is not found or does not belong to the
 *   specified workflow.
 */
export async function deletenotificationWorkflowSystemAdminWorkflowsWorkflowIdWorkflowEdgesWorkflowEdgeId(props: {
  systemAdmin: SystemAdminPayload;
  workflowId: string & tags.Format<"uuid">;
  workflowEdgeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, workflowId, workflowEdgeId } = props;

  // Verify the edge exists and belongs to the given workflow
  const edge =
    await MyGlobal.prisma.notification_workflow_workflow_edges.findUniqueOrThrow(
      {
        where: { id: workflowEdgeId },
        select: { workflow_id: true },
      },
    );

  if (edge.workflow_id !== workflowId) {
    throw new Error("Workflow edge does not belong to the specified workflow");
  }

  // Delete the edge permanently
  await MyGlobal.prisma.notification_workflow_workflow_edges.delete({
    where: { id: workflowEdgeId },
  });
}
