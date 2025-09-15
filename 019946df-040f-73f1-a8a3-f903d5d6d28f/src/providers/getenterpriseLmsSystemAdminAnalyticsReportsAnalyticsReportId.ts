import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve detailed analytics report information by its unique ID.
 *
 * This operation fetches the full analytics report including metadata, JSON
 * filter parameters, generation timestamp, and report content. Access is
 * restricted to authenticated system administrators.
 *
 * @param props - Properties including systemAdmin authorization and report ID
 * @param props.systemAdmin - Authenticated system administrator context
 * @param props.analyticsReportId - Unique UUID of the analytics report
 * @returns Full analytics report data matching the specified ID
 * @throws {Error} Throws if the analytics report is not found
 */
export async function getenterpriseLmsSystemAdminAnalyticsReportsAnalyticsReportId(props: {
  systemAdmin: SystemadminPayload;
  analyticsReportId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsAnalyticsReport> {
  const { analyticsReportId } = props;

  const report =
    await MyGlobal.prisma.enterprise_lms_analytics_reports.findUniqueOrThrow({
      where: { id: analyticsReportId, deleted_at: null },
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
