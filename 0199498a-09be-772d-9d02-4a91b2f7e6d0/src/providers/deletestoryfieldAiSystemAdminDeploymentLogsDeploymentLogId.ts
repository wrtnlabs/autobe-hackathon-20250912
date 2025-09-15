import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently delete a deployment log record (storyfield_ai_deployment_logs
 * table).
 *
 * This operation allows a validated system administrator to irreversibly remove
 * a deployment, rollback, or hotfix event log from the system. The deletion is
 * a hard delete: the deployment log is physically removed from the database and
 * cannot be recovered. Only administrators with an authorized
 * SystemadminPayload may perform this operation. Deletion attempts for
 * nonexistent logs result in an error.
 *
 * @param props - Contains the authenticated system admin's payload and the ID
 *   of the deployment log to delete
 * @param props.systemAdmin - Authenticated admin credentials for authorization
 * @param props.deploymentLogId - UUID of the deployment log to delete
 * @returns Void
 * @throws {Error} If the deployment log does not exist or has already been
 *   deleted
 */
export async function deletestoryfieldAiSystemAdminDeploymentLogsDeploymentLogId(props: {
  systemAdmin: SystemadminPayload;
  deploymentLogId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { deploymentLogId } = props;

  // Verify that the deployment log exists before deletion.
  const existing =
    await MyGlobal.prisma.storyfield_ai_deployment_logs.findUnique({
      where: { id: deploymentLogId },
    });
  if (!existing) {
    throw new Error("Deployment log not found");
  }

  // Hard delete: completely remove the log from storage.
  await MyGlobal.prisma.storyfield_ai_deployment_logs.delete({
    where: { id: deploymentLogId },
  });
}
