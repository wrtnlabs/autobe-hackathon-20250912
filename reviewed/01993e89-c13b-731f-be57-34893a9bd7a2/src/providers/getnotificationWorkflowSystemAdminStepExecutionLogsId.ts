import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowStepExecutionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowStepExecutionLog";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Retrieve step execution log details by ID
 *
 * This operation fetches detailed information about a specific step execution
 * log identified by its unique ID. The log includes timestamps, input/output
 * contexts, success flag, and optional message IDs and error messages for email
 * or SMS.
 *
 * @param props - Object containing the system administrator payload and the
 *   step execution log ID
 * @param props.systemAdmin - Authenticated system administrator performing the
 *   request
 * @param props.id - Unique identifier (UUID) of the step execution log to
 *   retrieve
 * @returns The detailed step execution log conforming to
 *   INotificationWorkflowStepExecutionLog
 * @throws Error if the step execution log with the specified ID is not found
 */
export async function getnotificationWorkflowSystemAdminStepExecutionLogsId(props: {
  systemAdmin: SystemAdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<INotificationWorkflowStepExecutionLog> {
  const { systemAdmin, id } = props;
  const log =
    await MyGlobal.prisma.notification_workflow_step_execution_logs.findUniqueOrThrow(
      {
        where: { id },
        select: {
          id: true,
          workflow_id: true,
          trigger_id: true,
          node_id: true,
          attempt: true,
          started_at: true,
          finished_at: true,
          input_context: true,
          output_context: true,
          success: true,
          email_message_id: true,
          sms_message_id: true,
          error_message: true,
        },
      },
    );

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
    email_message_id: log.email_message_id ?? undefined,
    sms_message_id: log.sms_message_id ?? undefined,
    error_message: log.error_message ?? undefined,
  };
}
