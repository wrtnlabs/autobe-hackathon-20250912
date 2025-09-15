import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Delete a workflow manager user permanently by id.
 *
 * This operation performs a hard delete on the workflow manager user identified
 * by the provided UUID. Any related audit logs or references are expected to be
 * handled elsewhere in business logic.
 *
 * Only systemAdmin role users may perform this operation.
 *
 * @param props - Properties including the authenticated systemAdmin and the
 *   UUID of the user to delete
 * @param props.systemAdmin - Authenticated systemAdmin performing the deletion
 * @param props.id - UUID of the workflow manager user to delete
 * @throws {Error} Throws if the specified workflow manager user does not exist
 */
export async function deletenotificationWorkflowSystemAdminWorkflowManagersId(props: {
  systemAdmin: SystemAdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, id } = props;

  // Verify existence
  const workflowManager =
    await MyGlobal.prisma.notification_workflow_workflowmanagers.findUnique({
      where: { id },
    });
  if (!workflowManager) {
    throw new Error("Workflow manager user not found.");
  }

  // Perform hard delete
  await MyGlobal.prisma.notification_workflow_workflowmanagers.delete({
    where: { id },
  });
}
