import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update an existing analytics report identified by its unique
 * analyticsReportId.
 *
 * This operation targets the enterprise_lms_analytics_reports table, allowing
 * modification of report details including reportName, reportType,
 * parametersJson, contentJson, and update timestamps.
 *
 * Security: Restricted to users with the systemAdmin role to ensure only
 * authorized personnel can modify analytics data.
 *
 * @param props - Object containing the authenticated systemAdmin user, the
 *   analyticsReportId path parameter, and the request body with update fields.
 * @returns The updated analytics report with all relevant fields.
 * @throws {Error} Throws if the specified analytics report does not exist.
 */
export async function putenterpriseLmsSystemAdminAnalyticsReportsAnalyticsReportId(props: {
  systemAdmin: SystemadminPayload;
  analyticsReportId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsAnalyticsReport.IUpdate;
}): Promise<IEnterpriseLmsAnalyticsReport> {
  const { systemAdmin, analyticsReportId, body } = props;

  await MyGlobal.prisma.enterprise_lms_analytics_reports.findUniqueOrThrow({
    where: { id: analyticsReportId },
  });

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.enterprise_lms_analytics_reports.update(
    {
      where: { id: analyticsReportId },
      data: {
        report_name: body.report_name ?? undefined,
        report_type: body.report_type ?? undefined,
        parameters_json: body.parameters_json ?? undefined,
        generated_at: body.generated_at
          ? toISOStringSafe(body.generated_at)
          : undefined,
        content_json: body.content_json ?? undefined,
        updated_at: now,
      },
    },
  );

  return {
    id: updated.id,
    tenant_id: updated.tenant_id,
    report_name: updated.report_name,
    report_type: updated.report_type,
    parameters_json: updated.parameters_json,
    generated_at: updated.generated_at
      ? toISOStringSafe(updated.generated_at)
      : null,
    content_json: updated.content_json,
    created_at: updated.created_at ? toISOStringSafe(updated.created_at) : now,
    updated_at: updated.updated_at ? toISOStringSafe(updated.updated_at) : now,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
