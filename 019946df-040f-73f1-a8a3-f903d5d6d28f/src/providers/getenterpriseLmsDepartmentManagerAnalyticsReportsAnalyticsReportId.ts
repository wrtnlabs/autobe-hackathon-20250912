import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Retrieve detailed analytics report by ID for a department manager.
 *
 * This function fetches a single analytics report record scoped by the
 * department manager's tenant to enforce authorization and returns all relevant
 * details including metadata, filter parameters, generation timestamp, and JSON
 * content for dashboards and audits.
 *
 * @param props - Object containing the departmentManager auth payload and
 *   analyticsReportId as parameters.
 * @param props.departmentManager - Authenticated department manager
 *   information.
 * @param props.analyticsReportId - UUID of the analytics report to retrieve.
 * @returns The detailed analytics report data transfer object.
 * @throws {Error} If the department manager or the analytics report is not
 *   found.
 */
export async function getenterpriseLmsDepartmentManagerAnalyticsReportsAnalyticsReportId(props: {
  departmentManager: DepartmentmanagerPayload;
  analyticsReportId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsAnalyticsReport> {
  const { departmentManager, analyticsReportId } = props;

  // Fetch the full department manager record to get tenant_id for authorization
  const departmentManagerRecord =
    await MyGlobal.prisma.enterprise_lms_departmentmanager.findUniqueOrThrow({
      where: { id: departmentManager.id },
      select: { tenant_id: true },
    });

  // Fetch the analytics report filtered by tenant_id and id
  const report =
    await MyGlobal.prisma.enterprise_lms_analytics_reports.findFirstOrThrow({
      where: {
        id: analyticsReportId,
        tenant_id: departmentManagerRecord.tenant_id,
      },
    });

  return {
    id: report.id,
    tenant_id: report.tenant_id,
    report_name: report.report_name,
    report_type: report.report_type,
    parameters_json: report.parameters_json,
    generated_at: toISOStringSafe(report.generated_at),
    content_json: report.content_json,
    created_at: toISOStringSafe(report.created_at),
    updated_at: toISOStringSafe(report.updated_at),
    deleted_at: report.deleted_at ? toISOStringSafe(report.deleted_at) : null,
  };
}
