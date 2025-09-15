import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowStepExecutionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowStepExecutionLog";
import { IPageINotificationWorkflowStepExecutionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowStepExecutionLog";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Search and retrieve a paginated list of step execution logs
 *
 * Retrieves filtered step execution logs from the
 * notification_workflow_step_execution_logs table. Supports filtering by
 * workflow_id, trigger_id, node_id, success status, and started_at date range,
 * with pagination.
 *
 * Access is granted to systemAdmin users for comprehensive audit access.
 *
 * @param props - Object containing systemAdmin payload and request body filters
 * @param props.systemAdmin - Authenticated systemAdmin user payload
 * @param props.body - Filtering and pagination options for step execution logs
 * @returns Paginated summary list of step execution logs matching filters
 * @throws {Error} Throws if database query fails or input is invalid
 */
export async function patchnotificationWorkflowSystemAdminStepExecutionLogs(props: {
  systemAdmin: SystemAdminPayload;
  body: INotificationWorkflowStepExecutionLog.IRequest;
}): Promise<IPageINotificationWorkflowStepExecutionLog.ISummary> {
  const { systemAdmin, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where = {
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
            ...(body.start_date !== undefined &&
              body.start_date !== null && { gte: body.start_date }),
            ...(body.end_date !== undefined &&
              body.end_date !== null && { lte: body.end_date }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.notification_workflow_step_execution_logs.findMany({
      where,
      orderBy: { started_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.notification_workflow_step_execution_logs.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id as string & tags.Format<"uuid">,
      workflow_id: row.workflow_id as string & tags.Format<"uuid">,
      trigger_id: row.trigger_id as string & tags.Format<"uuid">,
      node_id: row.node_id as string & tags.Format<"uuid">,
      attempt: row.attempt as number & tags.Type<"int32">,
      started_at: toISOStringSafe(row.started_at),
      finished_at: toISOStringSafe(row.finished_at),
      success: row.success,
    })),
  };
}
