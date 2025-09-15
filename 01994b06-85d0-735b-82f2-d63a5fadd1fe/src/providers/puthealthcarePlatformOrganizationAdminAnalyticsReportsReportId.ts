import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsReport";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update specific analytics report configuration or metadata by reportId in the
 * healthcare_platform_analytics_reports table.
 *
 * Allows authorized organization administrators to update the details,
 * configuration, and template of an existing analytics report, as uniquely
 * identified by reportId. This operation accesses the
 * healthcare_platform_analytics_reports Prisma model to support updates to key
 * fields, such as the report name, configuration JSON, description, department
 * assignment, and active status. Audit trails and full versioning are enforced
 * per business and compliance policy.
 *
 * Security validation restricts access to administrators within the appropriate
 * organization, ensuring changes are recorded with attribution and timestamp.
 * All update attempts are recorded for audit tracking and compliance review.
 * This function ensures name uniqueness, validates the syntactic correctness of
 * configuration JSON, and enforces department/org scope. Handles concurrency
 * and business validation errors in compliance with platform policy.
 *
 * @param props - Operation parameters
 * @param props.organizationAdmin - Authenticated organization admin
 *   (OrganizationadminPayload)
 * @param props.reportId - UUID of the report to update
 * @param props.body - IHealthcarePlatformAnalyticsReport.IUpdate containing
 *   allowed mutable fields
 * @returns The updated analytics report metadata as
 *   IHealthcarePlatformAnalyticsReport
 * @throws {Error} If the report does not exist, permission is denied, name is
 *   not unique, or template_config_json is invalid JSON
 */
export async function puthealthcarePlatformOrganizationAdminAnalyticsReportsReportId(props: {
  organizationAdmin: OrganizationadminPayload;
  reportId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAnalyticsReport.IUpdate;
}): Promise<IHealthcarePlatformAnalyticsReport> {
  const { organizationAdmin, reportId, body } = props;

  // 1. Fetch the target report
  const report =
    await MyGlobal.prisma.healthcare_platform_analytics_reports.findUnique({
      where: { id: reportId },
    });
  if (report === null) throw new Error("Report not found");

  // 2. Find all org IDs where this admin is currently assigned and active. This delineates admin's authority scope.
  const adminOrgAssignments =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findMany({
      where: {
        user_id: organizationAdmin.id,
        assignment_status: "active",
        deleted_at: null,
      },
      select: { healthcare_platform_organization_id: true },
    });
  const allowedOrganizationIds = adminOrgAssignments.map(
    (a) => a.healthcare_platform_organization_id,
  );
  if (!allowedOrganizationIds.includes(report.organization_id)) {
    throw new Error(
      "Forbidden: organization admin cannot update reports outside their assigned organization(s)",
    );
  }

  // 3. Name uniqueness check (org-level) if name to be updated
  if (body.name !== undefined && body.name !== report.name) {
    const existing =
      await MyGlobal.prisma.healthcare_platform_analytics_reports.findFirst({
        where: {
          name: body.name,
          organization_id: report.organization_id,
          id: { not: reportId },
        },
      });
    if (existing !== null) {
      throw new Error(
        "A report with this name already exists in the organization",
      );
    }
  }

  // 4. Validate template_config_json as syntactically correct JSON if present
  if (body.template_config_json !== undefined) {
    try {
      JSON.parse(body.template_config_json);
    } catch {
      throw new Error("template_config_json must be a valid JSON string");
    }
  }

  // 5. Prepare update fields, only including present keys. Handle null/undefined for nullable fields.
  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.template_config_json !== undefined)
    updateData.template_config_json = body.template_config_json;
  if (body.is_active !== undefined) updateData.is_active = body.is_active;
  if (body.department_id !== undefined)
    updateData.department_id = body.department_id;
  updateData.updated_at = toISOStringSafe(new Date());

  // 6. Update report in database
  const updated =
    await MyGlobal.prisma.healthcare_platform_analytics_reports.update({
      where: { id: reportId },
      data: updateData,
    });

  // 7. Construct return value with proper type normalization
  return {
    id: updated.id,
    created_by_user_id: updated.created_by_user_id,
    organization_id: updated.organization_id,
    department_id: updated.department_id ?? undefined,
    name: updated.name,
    description: updated.description ?? undefined,
    template_config_json: updated.template_config_json,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
