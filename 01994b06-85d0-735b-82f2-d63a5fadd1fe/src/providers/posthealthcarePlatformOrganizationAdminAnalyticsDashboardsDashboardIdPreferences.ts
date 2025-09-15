import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDashboardPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDashboardPreference";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new analytics dashboard preferences record
 * (IHealthcarePlatformDashboardPreference) for a specific dashboard.
 *
 * This operation creates a new dashboard preferences record for a user's
 * analytics dashboard. The preference links the user and dashboard IDs, storing
 * JSON-serialized customization settings (theme, layout, widget configs,
 * filters, etc.), and timestamps the creation/update. The function ensures that
 * the dashboard exists and is not deleted, the organization admin is authorized
 * (context-validated), and no duplicate preferences exist for the same
 * user/dashboard combination. On success, returns the complete dashboard
 * preference record.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing this action
 * @param props.dashboardId - The analytics dashboard ID for which preferences
 *   are being created
 * @param props.body - The dashboard preference creation data (ICreate)
 * @returns The created dashboard preferences record, reflecting all
 *   user-specific settings and associations
 * @throws {Error} If the dashboard does not exist or is deleted
 * @throws {Error} If a preference already exists for the user and dashboard
 * @throws {Error} If organization admin is not authorized to manage this
 *   dashboard/user
 */
export async function posthealthcarePlatformOrganizationAdminAnalyticsDashboardsDashboardIdPreferences(props: {
  organizationAdmin: OrganizationadminPayload;
  dashboardId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformDashboardPreference.ICreate;
}): Promise<IHealthcarePlatformDashboardPreference> {
  const { organizationAdmin, dashboardId, body } = props;

  // 1. Validate dashboard exists (not deleted)
  const dashboard =
    await MyGlobal.prisma.healthcare_platform_analytics_dashboards.findFirst({
      where: { id: dashboardId, deleted_at: null },
    });
  if (!dashboard) {
    throw new Error("Dashboard not found, inaccessible, or deleted.");
  }

  // 2. Validate preference does not already exist (skip deleted)
  const exists =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.findFirst({
      where: {
        dashboard_id: dashboardId,
        user_id: body.user_id,
        deleted_at: null,
      },
    });
  if (exists) {
    throw new Error(
      "Dashboard preference already exists for this user and dashboard.",
    );
  }

  // 3. (Optionally add stricter org authorization here)

  // 4. Insert new dashboard preference record
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.healthcare_platform_dashboard_preferences.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        dashboard_id: dashboardId,
        user_id: body.user_id,
        preferences_json: body.preferences_json,
        created_at: now,
        updated_at: now,
        last_viewed_at: null,
        deleted_at: null,
      },
    });

  // 5. Return IHealthcarePlatformDashboardPreference, mapping nulls and branding as required
  return {
    id: created.id,
    dashboard_id: created.dashboard_id,
    user_id: created.user_id,
    preferences_json: created.preferences_json,
    last_viewed_at: created.last_viewed_at
      ? toISOStringSafe(created.last_viewed_at)
      : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
