import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowAuditLog";
import { IPageINotificationWorkflowAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowAuditLog";
import { TriggerOperatorPayload } from "../decorators/payload/TriggerOperatorPayload";

/**
 * Retrieve a filtered and paginated list of notification workflow audit log
 * records.
 *
 * This operation supports complex searching with pagination to facilitate audit
 * log analysis. Authorized trigger operators can query entries filtered by
 * actor, event type, and creation timestamp. The logs reflect immutable
 * recorded events related to workflows, triggers, and system users.
 *
 * @param props - An object containing the authenticated trigger operator and
 *   the audit log request body.
 * @param props.triggerOperator - The authenticated trigger operator performing
 *   the request.
 * @param props.body - Search criteria and pagination info for audit log
 *   filtering.
 * @returns A paginated summary of notification workflow audit logs that match
 *   the search criteria.
 * @throws {Error} If any database operation fails.
 */
export async function patchnotificationWorkflowTriggerOperatorAuditLogs(props: {
  triggerOperator: TriggerOperatorPayload;
  body: INotificationWorkflowAuditLog.IRequest;
}): Promise<IPageINotificationWorkflowAuditLog.ISummary> {
  const { body } = props;

  // Default pagination
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;

  // Build where filters
  const where: {
    actor_id?: string & tags.Format<"uuid">;
    event_type?: { contains: string };
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = {};

  if (body.actor_id !== undefined && body.actor_id !== null) {
    where.actor_id = body.actor_id;
  }
  if (body.event_type !== undefined && body.event_type !== null) {
    where.event_type = { contains: body.event_type };
  }
  if (
    (body.created_after !== undefined && body.created_after !== null) ||
    (body.created_before !== undefined && body.created_before !== null)
  ) {
    where.created_at = {};
    if (body.created_after !== undefined && body.created_after !== null) {
      where.created_at.gte = body.created_after;
    }
    if (body.created_before !== undefined && body.created_before !== null) {
      where.created_at.lte = body.created_before;
    }
  }

  // Fetch data and count concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.notification_workflow_audit_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        actor_id: true,
        event_type: true,
        event_data: true,
        created_at: true,
      },
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
    data: data.map((item) => ({
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
