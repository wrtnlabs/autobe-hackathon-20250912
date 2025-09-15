import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowAuditLog";
import { IPageINotificationWorkflowAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowAuditLog";
import { WorkflowmanagerPayload } from "../decorators/payload/WorkflowmanagerPayload";

/**
 * Retrieve a filtered and paginated list of notification workflow audit logs.
 *
 * Authorized users (workflowManager) can query immutable audit entries related
 * to workflows, including filtering by actor id, event type, and timestamp
 * range. Results are paginated and ordered by most recent first.
 *
 * @param props - Object containing workflowManager authentication and query
 *   filters
 * @param props.workflowManager - Authenticated workflowManager payload
 * @param props.body - Filtering and pagination parameters as per IRequest
 * @returns Paginated audit log summaries matching filter criteria
 * @throws {Error} Throws error if query parameters are invalid or database
 *   queries fail
 */
export async function patchnotificationWorkflowWorkflowManagerAuditLogs(props: {
  workflowManager: WorkflowmanagerPayload;
  body: INotificationWorkflowAuditLog.IRequest;
}): Promise<IPageINotificationWorkflowAuditLog.ISummary> {
  const { workflowManager, body } = props;

  // Safely set pagination parameters with defaults
  const page =
    body.page !== undefined && body.page !== null && body.page >= 1
      ? body.page
      : 1;
  const limit =
    body.limit !== undefined && body.limit !== null && body.limit >= 1
      ? body.limit
      : 10;

  // Build conditions for filtering audit logs
  const where: Record<string, unknown> = {};

  if (body.actor_id !== undefined && body.actor_id !== null) {
    where.actor_id = body.actor_id;
  }

  if (body.event_type !== undefined && body.event_type !== null) {
    where.event_type = body.event_type;
  }

  if (body.created_after !== undefined && body.created_after !== null) {
    where.created_at = {
      ...((where.created_at as object) ?? {}),
      gte: body.created_after,
    };
  }

  if (body.created_before !== undefined && body.created_before !== null) {
    where.created_at = {
      ...((where.created_at as object) ?? {}),
      lte: body.created_before,
    };
  }

  // Calculate the offset for pagination
  const skip = (page - 1) * limit;

  // Execute simultaneous queries for total count and paginated records
  const [records, total] = await Promise.all([
    MyGlobal.prisma.notification_workflow_audit_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.notification_workflow_audit_logs.count({ where }),
  ]);

  // Map Prisma results to API response structure with correct typing and date formatting
  const data = records.map((log) => ({
    id: log.id as string & tags.Format<"uuid">,
    actor_id:
      log.actor_id === null
        ? null
        : (log.actor_id as string & tags.Format<"uuid">),
    event_type: log.event_type,
    event_data: log.event_data,
    created_at: toISOStringSafe(log.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
