import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new analytics dashboard definition
 *
 * This operation creates a new analytics dashboard for an organization or
 * department, assigning ownership, configuration, and visibility based on the
 * request input. The new record is inserted into the
 * healthcare_platform_analytics_dashboards table with system-generated ID and
 * timestamps. Only authenticated organization admins may create dashboards, and
 * business rules enforce uniqueness and ownership constraints according to
 * backend validation.
 *
 * @param props - Properties for dashboard creation
 * @param props.organizationAdmin - The authenticated organization admin user
 *   creating the dashboard (must match OrganizationadminPayload)
 * @param props.body - Dashboard creation data (title, description, config,
 *   org/department context, owner)
 * @returns The newly created analytics dashboard object, including all metadata
 *   and config for immediate use
 * @throws {Error} If constraint violations or DB/business errors occur (e.g.,
 *   duplicate title, invalid owner, or missing org/department)
 */
export async function posthealthcarePlatformOrganizationAdminAnalyticsDashboards(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformAnalyticsDashboard.ICreate;
}): Promise<IHealthcarePlatformAnalyticsDashboard> {
  const { organizationAdmin, body } = props;

  // Prepare timestamps and ID
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const dashboardId: string & tags.Format<"uuid"> = v4();

  // Insert new dashboard
  const created =
    await MyGlobal.prisma.healthcare_platform_analytics_dashboards.create({
      data: {
        id: dashboardId,
        owner_user_id: body.owner_user_id,
        organization_id: body.organization_id,
        department_id: body.department_id ?? null,
        title: body.title,
        description: body.description ?? null,
        config_json: body.config_json,
        is_public: body.is_public,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    owner_user_id: created.owner_user_id,
    organization_id: created.organization_id,
    department_id: created.department_id ?? undefined,
    title: created.title,
    description: created.description ?? undefined,
    config_json: created.config_json,
    is_public: created.is_public,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
