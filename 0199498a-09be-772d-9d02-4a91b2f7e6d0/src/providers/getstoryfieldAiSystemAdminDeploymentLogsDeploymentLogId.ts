import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiDeploymentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiDeploymentLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve detailed record for a specific deployment or rollback event log
 * (storyfield_ai_deployment_logs)
 *
 * Fetches all available deployment, rollback, or hotfix metadata for a single
 * deployment event log, identified by deploymentLogId. Result includes label,
 * action type, environment, initiator, status, full summary, timestamps, and
 * soft-deletion status.
 *
 * Authorization: Only accessible to authenticated system administrators
 * (SystemadminPayload). Will throw if record does not exist or is
 * soft-deleted.
 *
 * @param props - { systemAdmin: Authenticated system admin payload
 *   (authorization required), deploymentLogId: Unique ID (uuid) for the target
 *   deployment log }
 * @returns IStoryfieldAiDeploymentLog - Full details of the deployment log
 *   entry
 * @throws Error if not found or soft-deleted
 */
export async function getstoryfieldAiSystemAdminDeploymentLogsDeploymentLogId(props: {
  systemAdmin: SystemadminPayload;
  deploymentLogId: string & tags.Format<"uuid">;
}): Promise<IStoryfieldAiDeploymentLog> {
  const { deploymentLogId } = props;
  // Only select active (not soft-deleted) record
  const record = await MyGlobal.prisma.storyfield_ai_deployment_logs.findFirst({
    where: {
      id: deploymentLogId,
      deleted_at: null,
    },
  });
  if (!record) {
    throw new Error("Deployment log not found or already deleted");
  }
  return {
    id: record.id,
    deployment_label: record.deployment_label,
    action_type: record.action_type,
    environment: record.environment,
    initiated_by: record.initiated_by,
    status: record.status,
    summary: record.summary,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
