import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowStepExecutionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowStepExecutionLog";
import { IPageINotificationWorkflowStepExecutionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowStepExecutionLog";
import { TriggerOperatorPayload } from "../decorators/payload/TriggerOperatorPayload";

/**
 * Searches and retrieves a paginated list of step execution logs for workflows.
 *
 * This operation supports advanced filtering capabilities including filters by
 * workflow ID, trigger instance ID, node ID, success status, and execution time
 * ranges. Pagination parameters control the result set size and offset.
 *
 * The results are sorted by start time descending to prioritize recent logs.
 *
 * @param props - Object containing the authenticated triggerOperator and the
 *   search request body
 * @param props.triggerOperator - The authenticated trigger operator payload
 * @param props.body - The search criteria and pagination parameters for
 *   filtering step execution logs
 * @returns A paginated summary list of step execution logs matching the filters
 * @throws {Error} When a database error occurs or parameters are invalid
 */
export async function patchnotificationWorkflowTriggerOperatorStepExecutionLogs(props: {
  triggerOperator: TriggerOperatorPayload;
  body: INotificationWorkflowStepExecutionLog.IRequest;
}): Promise<IPageINotificationWorkflowStepExecutionLog.ISummary> {
  const { body } = props;
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const whereCondition = {
    ...(body.workflow_id !== undefined &&
      body.workflow_id !== null && { workflow_id: body.workflow_id }),
    ...(body.trigger_id !== undefined &&
      body.trigger_id !== null && { trigger_id: body.trigger_id }),
    ...(body.node_id !== undefined &&
      body.node_id !== null && { node_id: body.node_id }),
    ...(body.success !== undefined &&
      body.success !== null && { success: body.success }),
    ...((body.start_date !== undefined && body.start_date !== null) ||
    (body.end_date !== undefined && body.end_date !== null)
      ? {
          started_at: {
            ...(body.start_date !== undefined && body.start_date !== null
              ? { gte: body.start_date }
              : {}),
            ...(body.end_date !== undefined && body.end_date !== null
              ? { lte: body.end_date }
              : {}),
          },
        }
      : {}),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.notification_workflow_step_execution_logs.findMany({
      where: whereCondition,
      orderBy: { started_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.notification_workflow_step_execution_logs.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((record) => ({
      id: record.id,
      workflow_id: record.workflow_id,
      trigger_id: record.trigger_id,
      node_id: record.node_id,
      attempt: record.attempt,
      started_at: toISOStringSafe(record.started_at),
      finished_at: toISOStringSafe(record.finished_at),
      success: record.success,
    })),
  };
}
