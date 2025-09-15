import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe"
import { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import { IPageIEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsAnalyticsReport";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload"

/**
 * Search and retrieve a filtered, paginated list of analytics reports.
 *
 * This operation retrieves analytics reports related to the Enterprise LMS tenants.
 * It supports filtering by report type, tenant ID, and textual search on report name
 * or type. Results are paginated and sorted according to the request parameters.
 *
 * The organization administrator's access is scoped to their tenant's data only.
 *
 * @param props - Object containing the organization admin and request body
 * @param props.organizationAdmin - The authenticated organization administrator payload
 * @param props.body - Search criteria and pagination parameters
 * @returns A paginated summary list of analytics reports matching the criteria
 * @throws {Error} Throws if the organization administrator or tenant is not found
 */
export async function patchenterpriseLmsOrganizationAdminAnalyticsReports(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsAnalyticsReport.IRequest;
}): Promise<IPageIEnterpriseLmsAnalyticsReport.ISummary> {
  const { organizationAdmin, body } = props;

  // Retrieve tenant ID from organizationAdmin
  const tenantId = (await MyGlobal.prisma.enterprise_lms_organizationadmin.findUniqueOrThrow({
    where: { id: organizationAdmin.id },
    select: { tenant_id: true },
  })).tenant_id;

  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build filter condition for prisma query
  const whereCondition = {
    tenant_id: tenantId,
    deleted_at: null,
    ...(body.report_type !== undefined && body.report_type !== null && {
      report_type: body.report_type,
    }),
    ...((body.search !== undefined && body.search !== null && body.search !== "") ? {
      OR: [
        { report_name: { contains: body.search } },
        { report_type: { contains: body.search } },
      ],
    } : {}),
  };

  // Parse order parameter
  const orderBy =
    body.order !== undefined && body.order !== null && body.order !== ""
      ? {
          [
            body.order.charAt(0) === "+" || body.order.charAt(0) === "-"
              ? body.order.slice(1)
              : "generated_at",
          ]:
            body.order.charAt(0) === "-" ? "desc" : "asc",
        }
      : { generated_at: "desc" };

  // Execute parallel queries
  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_analytics_reports.findMany({
      where: whereCondition,
      select: {
        id: true,
        report_name: true,
        report_type: true,
      },
      orderBy: orderBy as any, // unavoidable dynamic key usage
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_analytics_reports.count({ where: whereCondition }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
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
