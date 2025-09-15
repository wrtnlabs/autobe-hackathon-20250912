import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * Delete workflow edge from workflow
 *
 * This function deletes a workflow edge identified by `workflowEdgeId` in the
 * specified workflow. It enforces authorization by verifying that the edge
 * belongs to the workflow. It performs a hard delete operation.
 *
 * @param props - Parameters including authenticated workflowManager,
 *   workflowId, and workflowEdgeId
 * @returns Void
 * @throws {Error} If the workflow edge does not belong to the specified
 *   workflow
 * @throws {Error} If the workflow edge is not found
 */
export async function deletenotificationWorkflowWorkflowManagerWorkflowsWorkflowIdWorkflowEdgesWorkflowEdgeId(props: {
  workflowManager: WorkflowmanagerPayload;
  workflowId: string & tags.Format<"uuid">;
  workflowEdgeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const edge =
    await MyGlobal.prisma.notification_workflow_workflow_edges.findUniqueOrThrow(
      {
        where: { id: props.workflowEdgeId },
      },
    );

  if (edge.workflow_id !== props.workflowId) {
    throw new Error(
      "Unauthorized: The workflow edge does not belong to the specified workflow.",
    );
  }

  await MyGlobal.prisma.notification_workflow_workflow_edges.delete({
    where: { id: props.workflowEdgeId },
  });
}
