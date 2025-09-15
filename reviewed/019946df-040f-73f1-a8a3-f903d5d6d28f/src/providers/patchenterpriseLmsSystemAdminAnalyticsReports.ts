import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import { IPageIEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsAnalyticsReport";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a filtered, paginated list of analytics reports.
 *
 * This operation allows system administrators to query precomputed analytics
 * reports with flexible filtering by tenant, type, and search terms, supporting
 * pagination and sorting.
 *
 * @param props - Object containing the authenticated system admin and search
 *   criteria.
 * @param props.systemAdmin - Authenticated system administrator performing the
 *   search.
 * @param props.body - Request body containing filtering, pagination, and
 *   ordering parameters.
 * @returns A paginated list of analytics report summaries matching the
 *   criteria.
 * @throws {Error} If database query fails or invalid parameters are provided.
 */
export async function patchenterpriseLmsSystemAdminAnalyticsReports(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsAnalyticsReport.IRequest;
}): Promise<IPageIEnterpriseLmsAnalyticsReport.ISummary> {
  const { systemAdmin, body } = props;

  // Ensure pagination defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where condition filtering out soft deleted entries
  const where: {
    deleted_at: null;
    tenant_id?: string & tags.Format<"uuid">;
    report_type?: string;
    OR?: (
      | { report_name: { contains: string } }
      | { report_type: { contains: string } }
    )[];
  } = {
    deleted_at: null,
  };

  if (body.tenant_id !== undefined && body.tenant_id !== null) {
    where.tenant_id = body.tenant_id;
  }

  if (body.report_type !== undefined && body.report_type !== null) {
    where.report_type = body.report_type;
  }

  if (body.search !== undefined && body.search !== null) {
    where.OR = [
      { report_name: { contains: body.search } },
      { report_type: { contains: body.search } },
    ];
  }

  // Validate order; use 'desc' as default
  const order =
    body.order === "asc" || body.order === "desc" ? body.order : "desc";

  // Query the reports with pagination and ordering
  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_analytics_reports.findMany({
      where,
      orderBy: { generated_at: order },
      skip,
      take: limit,
      select: {
        id: true,
        report_name: true,
        report_type: true,
      },
    }),
    MyGlobal.prisma.enterprise_lms_analytics_reports.count({ where }),
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
      report_name: r.report_name,
      report_type: r.report_type,
    })),
  };
}
