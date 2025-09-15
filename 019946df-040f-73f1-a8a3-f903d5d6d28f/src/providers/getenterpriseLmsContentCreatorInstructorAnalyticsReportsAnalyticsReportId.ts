import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Retrieves a detailed analytics report by its unique ID for a content
 * creator/instructor.
 *
 * This operation fetches the analytics report record scoped by the tenant of
 * the authenticated content creator/instructor. It ensures authorization by
 * tenant linkage.
 *
 * All date/time fields are converted to ISO 8601 strings with the required
 * formatting tag.
 *
 * @param props - Object containing the content creator/instructor payload and
 *   the analytics report ID.
 * @returns The detailed analytics report object.
 * @throws {Error} When the content creator/instructor or analytics report is
 *   not found or unauthorized.
 */
export async function getenterpriseLmsContentCreatorInstructorAnalyticsReportsAnalyticsReportId(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  analyticsReportId: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsAnalyticsReport> {
  const { contentCreatorInstructor, analyticsReportId } = props;

  // Find instructor to confirm tenant and active status
  const instructor =
    await MyGlobal.prisma.enterprise_lms_contentcreatorinstructor.findUniqueOrThrow(
      {
        where: { id: contentCreatorInstructor.id },
      },
    );

  // Find analytics report matching tenant and ID
  const report =
    await MyGlobal.prisma.enterprise_lms_analytics_reports.findFirstOrThrow({
      where: {
        id: analyticsReportId,
        tenant_id: instructor.tenant_id,
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
