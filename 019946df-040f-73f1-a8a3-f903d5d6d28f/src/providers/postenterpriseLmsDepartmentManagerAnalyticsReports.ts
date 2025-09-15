import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAnalyticsReport";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Create a new analytics report record in the Enterprise LMS.
 *
 * This endpoint allows an authorized department manager to create an analytics
 * report for the tenant they belong to. The analytics report contains
 * precomputed data for dashboard visualizations and compliance reporting.
 *
 * @param props - Request properties containing the authenticated department
 *   manager and the analytics report creation payload.
 * @param props.departmentManager - Authenticated department manager payload
 *   with user ID.
 * @param props.body - Analytics report creation data conforming to
 *   IEnterpriseLmsAnalyticsReport.ICreate.
 * @returns The newly created analytics report with all stored fields populated.
 * @throws {Error} When the authenticated user is not found or unauthorized
 *   (tenant mismatch).
 */
export async function postenterpriseLmsDepartmentManagerAnalyticsReports(props: {
  departmentManager: DepartmentmanagerPayload;
  body: IEnterpriseLmsAnalyticsReport.ICreate;
}): Promise<IEnterpriseLmsAnalyticsReport> {
  const { departmentManager, body } = props;

  // Fetch department manager DB record to check tenant_id
  const deptManager =
    await MyGlobal.prisma.enterprise_lms_departmentmanager.findUnique({
      where: { id: departmentManager.id },
    });

  if (!deptManager) {
    throw new Error("Department Manager not found");
  }

  if (deptManager.tenant_id !== body.tenant_id) {
    throw new Error("Unauthorized: tenant_id mismatch");
  }

  const nowTimestamp = toISOStringSafe(new Date());

  // Create the analytics report record
  const created = await MyGlobal.prisma.enterprise_lms_analytics_reports.create(
    {
      data: {
        id: v4(),
        tenant_id: body.tenant_id,
        report_name: body.report_name,
        report_type: body.report_type,
        parameters_json: body.parameters_json,
        generated_at: toISOStringSafe(body.generated_at),
        content_json: body.content_json,
        created_at: nowTimestamp,
        updated_at: nowTimestamp,
        deleted_at: null,
      },
    },
  );

  return {
    id: created.id as string & tags.Format<"uuid">,
    tenant_id: created.tenant_id as string & tags.Format<"uuid">,
    report_name: created.report_name,
    report_type: created.report_type,
    parameters_json: created.parameters_json,
    generated_at: toISOStringSafe(created.generated_at),
    content_json: created.content_json,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
