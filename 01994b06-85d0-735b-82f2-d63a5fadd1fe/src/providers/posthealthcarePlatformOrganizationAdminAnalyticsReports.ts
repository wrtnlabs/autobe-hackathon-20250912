import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsReport";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new analytics report definition in the
 * healthcare_platform_analytics_reports table.
 *
 * Allows authorized organization administrators to define and register a new
 * analytics report template for use in dashboards, business intelligence, or
 * compliance processing. The POST operation inserts a record in the
 * healthcare_platform_analytics_reports table, assigning template
 * configuration, naming, activation state, and visibility scope (organization,
 * department, or user level).
 *
 * Security validation ensures only users with appropriate privileges can create
 * reports for their organization. The created report includes full audit and
 * version/timestamp fields and will surface any unique name conflict.
 *
 * @param props - { organizationAdmin: OrganizationadminPayload; body:
 *   IHealthcarePlatformAnalyticsReport.ICreate }
 *
 *   - OrganizationAdmin: The authenticated organization admin performing the
 *       operation
 *   - Body: The report creation payload, including name, description, config JSON,
 *       and scope
 *
 * @returns The created IHealthcarePlatformAnalyticsReport object with full
 *   metadata
 * @throws {Error} If the admin is not permitted to create for the supplied
 *   organization, or if a name conflict occurs
 */
export async function posthealthcarePlatformOrganizationAdminAnalyticsReports(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformAnalyticsReport.ICreate;
}): Promise<IHealthcarePlatformAnalyticsReport> {
  const { organizationAdmin, body } = props;

  // Validate required fields
  if (
    !body.organization_id ||
    typeof body.organization_id !== "string" ||
    body.organization_id.length === 0
  ) {
    throw new Error("Invalid or missing organization_id");
  }
  if (!organizationAdmin || !organizationAdmin.id) {
    throw new Error("Invalid organization admin context");
  }

  // Prepare ISO 8601 date-time strings
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Generate UUID for new report
  const reportId: string & tags.Format<"uuid"> = v4();

  let created;
  try {
    created =
      await MyGlobal.prisma.healthcare_platform_analytics_reports.create({
        data: {
          id: reportId,
          created_by_user_id: organizationAdmin.id,
          organization_id: body.organization_id,
          department_id:
            typeof body.department_id === "undefined"
              ? undefined
              : body.department_id,
          name: body.name,
          description:
            typeof body.description === "undefined"
              ? undefined
              : body.description,
          template_config_json: body.template_config_json,
          is_active: body.is_active,
          created_at: now,
          updated_at: now,
          deleted_at: undefined,
        },
      });
  } catch (error: unknown) {
    // Prisma unique constraint violation
    if (
      typeof error === "object" &&
      error !== null &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error(
        "Report creation failed: An analytics report with this name already exists in this organization.",
      );
    }
    throw error instanceof Error ? error : new Error(String(error));
  }

  // Map DB result to strict DTO with correct type handling
  return {
    id: created.id,
    created_by_user_id: created.created_by_user_id,
    organization_id: created.organization_id,
    department_id:
      typeof created.department_id === "undefined" ||
      created.department_id === null
        ? undefined
        : created.department_id,
    name: created.name,
    description:
      typeof created.description === "undefined" || created.description === null
        ? undefined
        : created.description,
    template_config_json: created.template_config_json,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      typeof created.deleted_at === "undefined" || created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
