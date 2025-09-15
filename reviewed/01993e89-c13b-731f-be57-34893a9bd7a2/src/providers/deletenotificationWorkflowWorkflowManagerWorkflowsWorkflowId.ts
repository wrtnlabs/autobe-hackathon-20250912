import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * Deletes a notification workflow permanently by its unique ID.
 *
 * This operation deletes the workflow record and cascades deletes all related
 * workflow nodes, edges, and trigger instances due to database cascade rules.
 *
 * Preconditions:
 *
 * - Only authorized workflowManager users may perform this operation.
 * - Deletion is prevented if any active trigger instances (status not 'completed'
 *   or 'failed') reference the workflow.
 *
 * @param props - Object containing the workflowManager authentication payload
 *   and workflowId
 * @param props.workflowManager - The authenticated workflow manager performing
 *   the deletion
 * @param props.workflowId - The UUID of the workflow to delete
 * @throws {Error} When the workflow is not found
 * @throws {Error} When active triggers prevent deletion
 */
export async function deletenotificationWorkflowWorkflowManagerWorkflowsWorkflowId(props: {
  workflowManager: WorkflowmanagerPayload;
  workflowId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { workflowManager, workflowId } = props;

  // Verify workflow exists
  await MyGlobal.prisma.notification_workflow_workflows.findUniqueOrThrow({
    where: { id: workflowId },
  });

  // Check for active triggers (status NOT in ['completed', 'failed'])
  const activeTrigger =
    await MyGlobal.prisma.notification_workflow_trigger_instances.findFirst({
      where: {
        workflow_id: workflowId,
        // status NOT in ['completed', 'failed']
        status: {
          notIn: ["completed", "failed"],
        },
      },
    });

  if (activeTrigger !== null) {
    throw new Error("Cannot delete workflow with active triggers");
  }

  // Perform hard delete
  await MyGlobal.prisma.notification_workflow_workflows.delete({
    where: { id: workflowId },
  });
}
