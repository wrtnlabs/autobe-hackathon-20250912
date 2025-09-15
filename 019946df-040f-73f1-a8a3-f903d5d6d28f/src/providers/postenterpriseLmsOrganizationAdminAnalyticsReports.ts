import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new analytics report record.
 *
 * This operation creates a new analytics report record in the Enterprise LMS
 * system scoped to a tenant. It requires an authenticated organization
 * administrator with permission to manage analytics data. The created report
 * includes all specified metadata and timestamp information.
 *
 * @param props - Object containing the authenticated organization admin and the
 *   report creation data
 * @param props.organizationAdmin - Authenticated organization administrator
 *   payload
 * @param props.body - Data for creating the analytics report, conforms to
 *   IEnterpriseLmsAnalyticsReport.ICreate
 * @returns The complete analytics report as stored in the database
 * @throws {Error} Throws if creation fails due to database or authorization
 *   issues
 */
export async function postenterpriseLmsOrganizationAdminAnalyticsReports(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsAnalyticsReport.ICreate;
}): Promise<IEnterpriseLmsAnalyticsReport> {
  const { organizationAdmin, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

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
      },
    },
  );

  return {
    id: created.id as string & tags.Format<"uuid">,
    tenant_id: created.tenant_id as string & tags.Format<"uuid">,
    report_name: created.report_name,
    report_type: created.report_type,
    parameters_json: created.parameters_json,
    generated_at: created.generated_at as string & tags.Format<"date-time">,
    content_json: created.content_json,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
