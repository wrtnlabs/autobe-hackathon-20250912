import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import { ContentcreatorinstructorPayload } from "../decorators/payload/ContentcreatorinstructorPayload";

/**
 * Create a new analytics report record in the Enterprise LMS.
 *
 * This operation creates a new analytics report for a specific tenant. It
 * stores precomputed data used for dashboards and compliance reporting. Access
 * is limited to authorized content creator/instructor users.
 *
 * @param props - Object containing contentCreatorInstructor auth payload and
 *   analytics report creation data
 * @param props.contentCreatorInstructor - Authenticated content
 *   creator/instructor user
 * @param props.body - Analytics report creation information conforming to
 *   IEnterpriseLmsAnalyticsReport.ICreate
 * @returns The newly created analytics report entity
 * @throws {Error} Throws if the creation fails or authorization is invalid
 */
export async function postenterpriseLmsContentCreatorInstructorAnalyticsReports(props: {
  contentCreatorInstructor: ContentcreatorinstructorPayload;
  body: IEnterpriseLmsAnalyticsReport.ICreate;
}): Promise<IEnterpriseLmsAnalyticsReport> {
  const { contentCreatorInstructor, body } = props;

  // Generate current timestamp as ISO string
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Generate new UUID for the analytics report
  const id: string & tags.Format<"uuid"> = v4() as string & tags.Format<"uuid">;

  // Create the analytics report record
  const created = await MyGlobal.prisma.enterprise_lms_analytics_reports.create(
    {
      data: {
        id,
        tenant_id: body.tenant_id,
        report_name: body.report_name,
        report_type: body.report_type,
        parameters_json: body.parameters_json,
        generated_at: body.generated_at,
        content_json: body.content_json,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  // Return the newly created record with correct types
  return {
    id: created.id,
    tenant_id: created.tenant_id,
    report_name: created.report_name,
    report_type: created.report_type,
    parameters_json: created.parameters_json,
    generated_at: created.generated_at as string & tags.Format<"date-time">,
    content_json: created.content_json,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
    deleted_at: created.deleted_at ?? null,
  };
}
