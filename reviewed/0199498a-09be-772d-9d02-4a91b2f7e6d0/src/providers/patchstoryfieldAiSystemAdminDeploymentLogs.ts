import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiDeploymentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiDeploymentLog";
import { IPageIStoryfieldAiDeploymentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiDeploymentLog";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve deployment/rollback event logs in a paginated, filterable
 * list (storyfield_ai_deployment_logs)
 *
 * Retrieves a paginated, filtered list of deployment, rollback, hotfix, and
 * config-change event logs. System admins can search by deployment label,
 * action type, environment, initiator, status, time range, and summary text.
 * Only non-deleted records are included. Useful for operational audit and
 * compliance review.
 *
 * Only system administrators and privileged operations users may access this
 * endpoint. Pagination is enforced, and full filtering is supported. All usage
 * is logged for compliance.
 *
 * @param props - Request properties
 * @param props.systemAdmin - System administrator performing the query
 * @param props.body - Filter/search/page request parameters (see
 *   IStoryfieldAiDeploymentLog.IRequest)
 * @returns Paginated, filtered list of deployment/rollback logs as summaries
 * @throws {Error} On DB query or other unexpected failure
 */
export async function patchstoryfieldAiSystemAdminDeploymentLogs(props: {
  systemAdmin: SystemadminPayload;
  body: IStoryfieldAiDeploymentLog.IRequest;
}): Promise<IPageIStoryfieldAiDeploymentLog.ISummary> {
  const { body } = props;

  // Extract and sanitize page/limit
  const rawPage = body.page ?? 1;
  const rawLimit = body.limit ?? 50;
  const page = Number(rawPage);
  const limit = Number(rawLimit);

  // Dynamically build Prisma 'where' filter, omitting undefined/empty
  const where: Record<string, unknown> = {
    deleted_at: null,
    ...(body.deployment_label !== undefined && {
      deployment_label: body.deployment_label,
    }),
    ...(body.action_type !== undefined && { action_type: body.action_type }),
    ...(body.environment !== undefined && { environment: body.environment }),
    ...(body.initiated_by !== undefined && { initiated_by: body.initiated_by }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.summary !== undefined && {
      summary: { contains: body.summary },
    }),
    ...(body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          created_at: {
            ...(body.created_at_from !== undefined && {
              gte: body.created_at_from,
            }),
            ...(body.created_at_to !== undefined && {
              lte: body.created_at_to,
            }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.storyfield_ai_deployment_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.storyfield_ai_deployment_logs.count({ where }),
  ]);

  // Map Prisma results to ISummary using correct branded string formats for dates
  const data = rows.map((row) => ({
    id: row.id,
    deployment_label: row.deployment_label,
    action_type: row.action_type,
    environment: row.environment,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== null && row.deleted_at !== undefined
        ? toISOStringSafe(row.deleted_at)
        : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(total / (limit === 0 ? 1 : limit)),
    },
    data,
  };
}
