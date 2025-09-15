import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Deletes a notification workflow permanently by its unique ID.
 *
 * This operation checks for active trigger instances associated with the
 * workflow to prevent deletion if any active triggers exist.
 *
 * Only authorized system administrators can perform this operation.
 *
 * @param props - Object containing system administrator payload and workflow ID
 * @param props.systemAdmin - Authenticated system administrator performing the
 *   deletion
 * @param props.workflowId - UUID of the workflow to delete
 * @throws {Error} Throws if active triggers are found referencing the workflow
 */
export async function deletenotificationWorkflowSystemAdminWorkflowsWorkflowId(props: {
  systemAdmin: SystemAdminPayload;
  workflowId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, workflowId } = props;

  // Check for active trigger instances with status 'enqueued' or 'processing'
  const activeTrigger =
    await MyGlobal.prisma.notification_workflow_trigger_instances.findFirst({
      where: {
        workflow_id: workflowId,
        status: { in: ["enqueued", "processing"] },
      },
    });

  if (activeTrigger) {
    throw new Error(
      "Cannot delete the workflow because it has active trigger instances",
    );
  }

  // Proceed to hard delete the workflow by ID; cascade deletes related entities
  await MyGlobal.prisma.notification_workflow_workflows.delete({
    where: { id: workflowId },
  });
}
