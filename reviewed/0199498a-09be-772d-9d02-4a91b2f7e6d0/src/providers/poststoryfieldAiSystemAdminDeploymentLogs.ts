import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiDeploymentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiDeploymentLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new deployment/rollback event log entry
 * (storyfield_ai_deployment_logs)
 *
 * This operation enables system administrators to record every deployment,
 * rollback, hotfix, configuration change, or related system event affecting the
 * StoryField AI server's environment. When invoked, a new log record is created
 * in the storyfield_ai_deployment_logs table, capturing action type, deployment
 * label, environment, initiator, outcome, status, summary, and timestamps.
 *
 * Strict input validation is enforced: deployment_label must be unique for the
 * environment, action_type is constrained to allowed values (e.g., deploy,
 * rollback, hotfix, config-change), and referential integrity is maintained.
 * The operation is only allowed for system administrators with valid
 * authentication. All operations are recorded for compliance.
 *
 * @param props - Object containing system admin authentication and log creation
 *   payload
 * @param props.systemAdmin - The authenticated SystemadminPayload making the
 *   request
 * @param props.body - The payload fields for the deployment/rollback log
 *   creation (deployment_label, action_type, environment, initiated_by, status,
 *   summary)
 * @returns The newly created deployment or rollback event log record with full
 *   audit fields populated
 * @throws {Error} When a record with the same deployment_label/environment
 *   already exists, or input fails business constraints
 */
export async function poststoryfieldAiSystemAdminDeploymentLogs(props: {
  systemAdmin: SystemadminPayload;
  body: IStoryfieldAiDeploymentLog.ICreate;
}): Promise<IStoryfieldAiDeploymentLog> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();
  const created = await MyGlobal.prisma.storyfield_ai_deployment_logs.create({
    data: {
      id,
      deployment_label: props.body.deployment_label,
      action_type: props.body.action_type,
      environment: props.body.environment,
      initiated_by: props.body.initiated_by,
      status: props.body.status,
      summary: props.body.summary,
      created_at: now,
      updated_at: now,
    },
  });
  return {
    id: created.id,
    deployment_label: created.deployment_label,
    action_type: created.action_type,
    environment: created.environment,
    initiated_by: created.initiated_by,
    status: created.status,
    summary: created.summary,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
