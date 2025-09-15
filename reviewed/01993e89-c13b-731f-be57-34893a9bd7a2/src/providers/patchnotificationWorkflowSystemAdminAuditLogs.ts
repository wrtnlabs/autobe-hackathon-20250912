import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowAuditLog";
import { IPageINotificationWorkflowAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowAuditLog";
import { SystemAdminPayload } from "../decorators/payload/SystemAdminPayload";

/**
 * Search and retrieve notification workflow audit logs.
 *
 * Retrieves a filtered and paginated list of immutable audit log records
 * capturing system actions and events related to notification workflows.
 * Authorized system administrators can query by actor, event type, and creation
 * time range. Supports pagination parameters for effective compliance and
 * troubleshooting.
 *
 * @param props - Request properties including authenticated systemAdmin and
 *   filter/pagination criteria
 * @param props.systemAdmin - The authenticated system administrator
 * @param props.body - Filter and pagination parameters for audit logs
 * @returns Paginated list of audit log summaries matching search criteria
 * @throws {Error} Throws if database operation fails
 */
export async function patchnotificationWorkflowSystemAdminAuditLogs(props: {
  systemAdmin: SystemAdminPayload;
  body: INotificationWorkflowAuditLog.IRequest;
}): Promise<IPageINotificationWorkflowAuditLog.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const skip = (page - 1) * limit;

  const where: {} = {};

  if (body.actor_id !== undefined && body.actor_id !== null) {
    (where as any).actor_id = body.actor_id;
  }

  if (
    body.event_type !== undefined &&
    body.event_type !== null &&
    body.event_type !== ""
  ) {
    (where as any).event_type = body.event_type;
  }

  if (
    (body.created_after !== undefined && body.created_after !== null) ||
    (body.created_before !== undefined && body.created_before !== null)
  ) {
    (where as any).created_at = {};
    if (body.created_after !== undefined && body.created_after !== null) {
      ((where as any).created_at as any).gte = body.created_after;
    }
    if (body.created_before !== undefined && body.created_before !== null) {
      ((where as any).created_at as any).lte = body.created_before;
    }
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.notification_workflow_audit_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.notification_workflow_audit_logs.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      actor_id:
        item.actor_id === null
          ? null
          : (item.actor_id as (string & tags.Format<"uuid">) | undefined),
      event_type: item.event_type,
      event_data: item.event_data,
      created_at: toISOStringSafe(item.created_at),
    })),
  };
}
