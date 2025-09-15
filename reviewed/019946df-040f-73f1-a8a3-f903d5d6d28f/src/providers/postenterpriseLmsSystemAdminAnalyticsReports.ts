import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new analytics report record.
 *
 * This operation inserts a new entry into the enterprise_lms_analytics_reports
 * table. Only authorized system administrator users may perform this
 * operation.
 *
 * @param props - The parameters including system admin credentials and the
 *   creation payload.
 * @param props.systemAdmin - The authenticated system administrator payload.
 * @param props.body - The creation data for the analytics report.
 * @returns The newly created analytics report entity.
 * @throws {Error} Throws if the creation fails or if unauthorized.
 */
export async function postenterpriseLmsSystemAdminAnalyticsReports(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsAnalyticsReport.ICreate;
}): Promise<IEnterpriseLmsAnalyticsReport> {
  const { systemAdmin, body } = props;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.enterprise_lms_analytics_reports.create(
    {
      data: {
        id: v4(),
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

  return {
    id: created.id,
    tenant_id: created.tenant_id,
    report_name: created.report_name,
    report_type: created.report_type,
    parameters_json: created.parameters_json,
    generated_at: created.generated_at,
    content_json: created.content_json,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
