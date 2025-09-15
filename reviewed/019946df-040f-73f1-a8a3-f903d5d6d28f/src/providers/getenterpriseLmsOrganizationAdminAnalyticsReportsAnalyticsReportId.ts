import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve detailed analytics report information by ID for an organization
 * admin.
 *
 * This operation fetches the analytics report scoped within the admin's tenant
 * context. Only active and non-deleted organization admins can access their
 * tenant's reports.
 *
 * @param props - Object containing authentication payload and the analytics
 *   report ID
 * @param props.organizationAdmin - Organization admin authentication payload
 *   containing user ID
 * @param props.analyticsReportId - UUID of the analytics report to retrieve
 * @returns Promise resolving to the detailed analytics report data
 * @throws {Error} Throws error if the organization admin is inactive/deleted or
 *   the report is not found
 */
export async function getenterpriseLmsOrganizationAdminAnalyticsReportsAnalyticsReportId(props: {
  organizationAdmin: OrganizationadminPayload;
  analyticsReportId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsAnalyticsReport> {
  const admin =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUniqueOrThrow({
      where: {
        id: props.organizationAdmin.id,
        deleted_at: null,
        status: "active",
      },
    });

  const report =
    await MyGlobal.prisma.enterprise_lms_analytics_reports.findFirst({
      where: { id: props.analyticsReportId, tenant_id: admin.tenant_id },
    });

  if (!report) throw new Error("Analytics report not found");

  return {
    id: report.id,
    tenant_id: report.tenant_id,
    report_name: report.report_name,
    report_type: report.report_type,
    parameters_json: report.parameters_json,
    generated_at: report.generated_at
      ? toISOStringSafe(report.generated_at)
      : ("" as string & tags.Format<"date-time">),
    content_json: report.content_json,
    created_at: report.created_at
      ? toISOStringSafe(report.created_at)
      : ("" as string & tags.Format<"date-time">),
    updated_at: report.updated_at
      ? toISOStringSafe(report.updated_at)
      : ("" as string & tags.Format<"date-time">),
    deleted_at: report.deleted_at ? toISOStringSafe(report.deleted_at) : null,
  };
}
