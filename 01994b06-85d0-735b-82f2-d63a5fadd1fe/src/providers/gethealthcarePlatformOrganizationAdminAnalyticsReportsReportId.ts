import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsReport";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a specific analytics report by ID from
 * healthcare_platform_analytics_reports table.
 *
 * This endpoint allows an authenticated organization admin to fetch the
 * complete configuration, metadata, creator reference, department/organization
 * context, and audit-relevant fields for an individual analytics report
 * identified by its UUID. Only organization admins assigned to the same
 * organization as the report may access this resource. If the report does not
 * exist, is soft-deleted, or the user does not have authorization, an error is
 * thrown for auditing and compliance.
 *
 * @param props - The operation arguments
 * @param props.organizationAdmin - The OrganizationadminPayload for the
 *   authenticated admin making the request
 * @param props.reportId - The UUID of the analytics report to retrieve
 * @returns The detailed analytics report configuration and metadata
 * @throws {Error} If the report is not found or the requester lacks privilege
 */
export async function gethealthcarePlatformOrganizationAdminAnalyticsReportsReportId(props: {
  organizationAdmin: OrganizationadminPayload;
  reportId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformAnalyticsReport> {
  const { organizationAdmin, reportId } = props;
  // Soft-deleted = inaccessible
  const report =
    await MyGlobal.prisma.healthcare_platform_analytics_reports.findFirst({
      where: {
        id: reportId,
        deleted_at: null,
      },
    });
  if (!report) throw new Error("Analytics report not found or already deleted");
  if (organizationAdmin.id !== report.organization_id) {
    throw new Error(
      "Access denied: You do not have permission to access this analytics report.",
    );
  }

  return {
    id: report.id,
    created_by_user_id: report.created_by_user_id,
    organization_id: report.organization_id,
    department_id: report.department_id ?? undefined,
    name: report.name,
    description: report.description ?? undefined,
    template_config_json: report.template_config_json,
    is_active: report.is_active,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at: report.deleted_at
      ? toISOStringSafe(report.deleted_at)
      : undefined,
  };
}
