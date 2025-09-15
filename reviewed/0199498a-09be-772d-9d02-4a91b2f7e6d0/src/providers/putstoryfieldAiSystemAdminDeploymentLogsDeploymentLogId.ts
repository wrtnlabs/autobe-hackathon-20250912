import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiDeploymentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiDeploymentLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing deployment/rollback event log entry by deploymentLogId
 * (storyfield_ai_deployment_logs)
 *
 * This API operation enables a system administrator to update a deployment,
 * rollback, or configuration event log. It allows modification of patchable
 * metadata (action_type, environment, status, summary) and triggers an
 * updated_at timestamp change. Input validation enforces that at least one
 * updatable field is provided, and only existing, non-deleted entries can be
 * updated. All permission and data integrity policies are enforced;
 * unauthorized access, updates to deleted entries, and empty update bodies
 * result in errors.
 *
 * @param props - Parameter object
 * @param props.systemAdmin - The authorized system administrator performing the
 *   update
 * @param props.deploymentLogId - Target log entry UUID
 * @param props.body - Fields to update (action_type, environment, status,
 *   summary)
 * @returns The updated IStoryfieldAiDeploymentLog with all fields returned as
 *   branded ISO strings
 * @throws {Error} If the log entry is not found, is deleted, or the update body
 *   is empty
 */
export async function putstoryfieldAiSystemAdminDeploymentLogsDeploymentLogId(props: {
  systemAdmin: SystemadminPayload;
  deploymentLogId: string & tags.Format<"uuid">;
  body: IStoryfieldAiDeploymentLog.IUpdate;
}): Promise<IStoryfieldAiDeploymentLog> {
  const { systemAdmin, deploymentLogId, body } = props;

  // Fetch the log entry to ensure it exists and is not soft deleted
  const log = await MyGlobal.prisma.storyfield_ai_deployment_logs.findFirst({
    where: { id: deploymentLogId, deleted_at: null },
  });
  if (!log) {
    throw new Error("Deployment log not found or has been deleted.");
  }

  // At least one updatable field must be present
  const anyPatch =
    body.action_type !== undefined ||
    body.environment !== undefined ||
    body.status !== undefined ||
    body.summary !== undefined;
  if (!anyPatch) {
    throw new Error("No updatable fields provided.");
  }

  // Update only provided fields + current updated_at
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.storyfield_ai_deployment_logs.update({
    where: { id: deploymentLogId },
    data: {
      ...(body.action_type !== undefined && { action_type: body.action_type }),
      ...(body.environment !== undefined && { environment: body.environment }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.summary !== undefined && { summary: body.summary }),
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    deployment_label: updated.deployment_label,
    action_type: updated.action_type,
    environment: updated.environment,
    initiated_by: updated.initiated_by,
    status: updated.status,
    summary: updated.summary,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
