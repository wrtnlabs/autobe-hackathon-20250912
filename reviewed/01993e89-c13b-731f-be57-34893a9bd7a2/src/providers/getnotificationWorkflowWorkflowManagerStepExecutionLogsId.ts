import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowStepExecutionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowStepExecutionLog";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * Retrieve detailed information about a specific step execution log by its
 * unique identifier.
 *
 * This operation retrieves all crucial execution details including timing,
 * input/output contexts, success flag, and associated message IDs or error
 * messages.
 *
 * Authorization: Only accessible by workflowManager role.
 *
 * @param props - Object containing workflowManager payload and step execution
 *   log ID
 * @param props.workflowManager - The authenticated workflowManager making the
 *   request
 * @param props.id - Unique identifier of the step execution log
 * @returns The detailed step execution log record
 * @throws {Error} Throws if the log is not found
 */
export async function getnotificationWorkflowWorkflowManagerStepExecutionLogsId(props: {
  workflowManager: WorkflowmanagerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<INotificationWorkflowStepExecutionLog> {
  const { id } = props;

  const log =
    await MyGlobal.prisma.notification_workflow_step_execution_logs.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  // Prisma client returns Date objects for DateTime fields, convert them to ISO strings
  // Use toISOStringSafe to safely convert both Date and string formats

  // For typed brand UUIDs, we rely on Prisma ORM to guarantee correctness

  return {
    id: log.id,
    workflow_id: log.workflow_id,
    trigger_id: log.trigger_id,
    node_id: log.node_id,
    attempt: log.attempt,
    started_at: toISOStringSafe(log.started_at),
    finished_at: toISOStringSafe(log.finished_at),
    input_context: log.input_context,
    output_context: log.output_context,
    success: log.success,
    email_message_id: log.email_message_id ?? null,
    sms_message_id: log.sms_message_id ?? null,
    error_message: log.error_message ?? null,
  };
}
