import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowStepExecutionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowStepExecutionLog";
import { IPageINotificationWorkflowStepExecutionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowStepExecutionLog";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

export async function patchnotificationWorkflowWorkflowManagerStepExecutionLogs(props: {
  workflowManager: WorkflowmanagerPayload;
  body: INotificationWorkflowStepExecutionLog.IRequest;
}): Promise<IPageINotificationWorkflowStepExecutionLog.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (props.body.workflow_id !== undefined && props.body.workflow_id !== null) {
    where.workflow_id = props.body.workflow_id;
  }

  if (props.body.trigger_id !== undefined && props.body.trigger_id !== null) {
    where.trigger_id = props.body.trigger_id;
  }

  if (props.body.node_id !== undefined && props.body.node_id !== null) {
    where.node_id = props.body.node_id;
  }

  if (props.body.success !== undefined && props.body.success !== null) {
    where.success = props.body.success;
  }

  if (
    (props.body.start_date !== undefined && props.body.start_date !== null) ||
    (props.body.end_date !== undefined && props.body.end_date !== null)
  ) {
    where.started_at = {};

    if (props.body.start_date !== undefined && props.body.start_date !== null) {
      where.started_at.gte = props.body.start_date;
    }

    if (props.body.end_date !== undefined && props.body.end_date !== null) {
      where.started_at.lte = props.body.end_date;
    }
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.notification_workflow_step_execution_logs.findMany({
      where,
      orderBy: { started_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        workflow_id: true,
        trigger_id: true,
        node_id: true,
        attempt: true,
        started_at: true,
        finished_at: true,
        success: true,
      },
    }),
    MyGlobal.prisma.notification_workflow_step_execution_logs.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((r) => ({
      id: r.id,
      workflow_id: r.workflow_id,
      trigger_id: r.trigger_id,
      node_id: r.node_id,
      attempt: r.attempt,
      started_at: toISOStringSafe(r.started_at),
      finished_at: toISOStringSafe(r.finished_at),
      success: r.success,
    })),
  };
}
