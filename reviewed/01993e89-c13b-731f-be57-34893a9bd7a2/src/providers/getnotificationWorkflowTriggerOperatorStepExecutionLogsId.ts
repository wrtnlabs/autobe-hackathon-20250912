import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowStepExecutionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowStepExecutionLog";
import { TriggerOperatorPayload } from "../decorators/payload/TriggerOperatorPayload";

/**
 * Retrieve detailed information about a specific notification workflow step
 * execution log by ID.
 *
 * This function ensures the triggerOperator is authorized and active before
 * retrieving the log entry. It returns all relevant properties including
 * timestamps (converted to ISO strings), context strings, success flag, and
 * optional message IDs or error messages.
 *
 * @param props - Object containing the triggerOperator payload and the step
 *   execution log ID
 * @param props.triggerOperator - Authenticated TriggerOperator payload
 * @param props.id - Unique identifier of the step execution log
 * @returns The detailed step execution log conforming to
 *   INotificationWorkflowStepExecutionLog
 * @throws {Error} If the triggerOperator is not authorized or inactive
 * @throws {Error} If the step execution log does not exist
 */
export async function getnotificationWorkflowTriggerOperatorStepExecutionLogsId(props: {
  triggerOperator: TriggerOperatorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<INotificationWorkflowStepExecutionLog> {
  const { triggerOperator, id } = props;

  const operator =
    await MyGlobal.prisma.notification_workflow_triggeroperators.findUnique({
      where: { id: triggerOperator.id },
    });

  if (!operator || operator.deleted_at !== null) {
    throw new Error("Unauthorized: triggerOperator not found or inactive");
  }

  const log =
    await MyGlobal.prisma.notification_workflow_step_execution_logs.findUnique({
      where: { id },
    });

  if (!log) {
    throw new Error("Step execution log not found");
  }

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
