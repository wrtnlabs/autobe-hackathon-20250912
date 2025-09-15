import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * Delete a workflow manager user permanently by UUID.
 *
 * This function performs a hard delete of the workflow manager user record from
 * the database.
 *
 * Authorization must be confirmed prior to calling this function; this function
 * assumes the caller is authorized as a workflowManager.
 *
 * @param props - Object containing the authenticated workflow manager payload
 *   and the UUID of the workflow manager user to delete.
 * @param props.workflowManager - Authenticated workflow manager payload with
 *   id.
 * @param props.id - UUID of the workflow manager user to be deleted.
 * @returns Promise<void>
 * @throws {Error} Throws if the workflow manager user with given ID does not
 *   exist.
 */
export async function deletenotificationWorkflowWorkflowManagerWorkflowManagersId(props: {
  workflowManager: WorkflowmanagerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.notification_workflow_workflowmanagers.findUniqueOrThrow(
    {
      where: { id: props.id },
    },
  );

  await MyGlobal.prisma.notification_workflow_workflowmanagers.delete({
    where: { id: props.id },
  });
}
