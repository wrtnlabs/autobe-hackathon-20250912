import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiServiceAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiServiceAlert";
import { IPageIStoryfieldAiServiceAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiServiceAlert";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * List, search, and paginate service alert event records
 * (storyfield_ai_service_alerts table).
 *
 * This operation allows system administrators to perform advanced filtering,
 * search, and pagination over the service-wide alert events recorded in the
 * storyfield_ai_service_alerts table. It enables querying by alert type, status
 * (resolved/unresolved), environment, or alert code. The operation returns a
 * paginated list of service alerts, suitable for monitoring dashboard
 * presentation, compliance review, or incident/health status analysis. Supports
 * complex search criteria via structured request body.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.body - Filtering, search, and pagination criteria for service
 *   alerts index/search
 * @returns Paginated list of service alert summary records matching search
 *   criteria
 * @throws {Error} When database operation fails
 */
export async function patchstoryfieldAiSystemAdminServiceAlerts(props: {
  systemAdmin: SystemadminPayload;
  body: IStoryfieldAiServiceAlert.IRequest;
}): Promise<IPageIStoryfieldAiServiceAlert.ISummary> {
  const { body } = props;
  const page =
    typeof body.page === "number" && body.page >= 0 ? Number(body.page) : 0;
  let limit =
    typeof body.limit === "number" && body.limit > 0 ? Number(body.limit) : 20;
  if (limit > 100) limit = 100;

  const sortByWhitelist = [
    "id",
    "alert_type",
    "alert_code",
    "environment",
    "resolved",
    "created_at",
    "updated_at",
    "deleted_at",
  ];
  const sortField =
    body.sort_by && sortByWhitelist.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // Build the Prisma where clause for advanced filtering
  const where = {
    ...(Array.isArray(body.alert_types) &&
      body.alert_types.length > 0 && {
        alert_type: { in: body.alert_types },
      }),
    ...(body.alert_code && { alert_code: body.alert_code }),
    ...(body.environment && { environment: body.environment }),
    ...(typeof body.resolved === "boolean" && { resolved: body.resolved }),
    ...(body.from || body.to
      ? {
          created_at: {
            ...(body.from && { gte: body.from }),
            ...(body.to && { lte: body.to }),
          },
        }
      : {}),
    ...(body.search && {
      OR: [
        { content: { contains: body.search } },
        { alert_code: { contains: body.search } },
        { alert_type: { contains: body.search } },
      ],
    }),
  };

  const [alerts, total] = await Promise.all([
    MyGlobal.prisma.storyfield_ai_service_alerts.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: page * limit,
      take: limit,
    }),
    MyGlobal.prisma.storyfield_ai_service_alerts.count({ where }),
  ]);

  const data = alerts.map((alert) => ({
    id: alert.id,
    alert_type: alert.alert_type,
    alert_code: alert.alert_code,
    environment: alert.environment,
    resolved: alert.resolved,
    created_at: toISOStringSafe(alert.created_at),
    updated_at: toISOStringSafe(alert.updated_at),
    deleted_at:
      alert.deleted_at !== null && alert.deleted_at !== undefined
        ? toISOStringSafe(alert.deleted_at)
        : undefined,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
