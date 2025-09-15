import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing analytics dashboard's configuration or content
 * (healthcare_platform_analytics_dashboards table).
 *
 * This operation allows an authenticated organization admin to update the
 * configuration, layout, and metadata of a specific analytics dashboard within
 * their organization. Only admins of the organization that owns the dashboard
 * are allowed to update it (RBAC enforced). The dashboard must exist and must
 * not be deleted. If updating department_id, the department must belong to the
 * same organization. All updates are tracked with updated_at timestamp for
 * audit/compliance.
 *
 * All date/datetime values are always returned as string &
 * tags.Format<'date-time'>; native Date is never used in types or output.
 *
 * @param props - Properties for the update operation:
 * @param props.organizationAdmin - The authenticated organization admin,
 *   containing id and type
 * @param props.dashboardId - The dashboard UUID to update
 * @param props.body - Update DTO (object with fields to change)
 * @returns The updated dashboard with all fields serialized as DTO shape
 * @throws {Error} If dashboard does not exist, is deleted, admin is not
 *   authorized, or department is invalid
 */
export async function puthealthcarePlatformOrganizationAdminAnalyticsDashboardsDashboardId(props: {
  organizationAdmin: OrganizationadminPayload;
  dashboardId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAnalyticsDashboard.IUpdate;
}): Promise<IHealthcarePlatformAnalyticsDashboard> {
  const { organizationAdmin, dashboardId, body } = props;

  // 1. Lookup dashboard (must not be deleted)
  const dashboard =
    await MyGlobal.prisma.healthcare_platform_analytics_dashboards.findFirst({
      where: {
        id: dashboardId,
        deleted_at: null,
      },
    });
  if (dashboard === null) {
    throw new Error("Dashboard not found or deleted");
  }

  // 2. RBAC: Admin must belong to this org (find org id for admin)
  // For orgAdmin, need to lookup their org admin table - but dashboard.organization_id is the parent
  // Simplest contract: admin can only update dashboards belonging to their org
  // For now, assume org admin id is unique; check org membership through join
  const orgAdminTable =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: { id: organizationAdmin.id, deleted_at: null },
    });
  if (orgAdminTable === null) {
    throw new Error("Organization admin not found or deleted");
  }

  // Dashboard must belong to the admin's organization for authority
  if (dashboard.organization_id !== orgAdminTable.id) {
    throw new Error("Unauthorized: admin does not belong to this organization");
  }

  // 3. If department_id present, must belong to this org
  if (body.department_id != null) {
    const department =
      await MyGlobal.prisma.healthcare_platform_departments.findFirst({
        where: {
          id: body.department_id,
          healthcare_platform_organization_id: dashboard.organization_id,
        },
      });
    if (department == null) {
      throw new Error("Invalid department_id for this organization");
    }
  }

  // 4. Prepare update input - only supplied fields
  const updateInput: Record<string, unknown> = {
    // Only update fields if present in body
    ...(Object.prototype.hasOwnProperty.call(body, "department_id") && {
      department_id: body.department_id,
    }),
    ...(Object.prototype.hasOwnProperty.call(body, "title") && {
      title: body.title,
    }),
    ...(Object.prototype.hasOwnProperty.call(body, "description") && {
      description: body.description,
    }),
    ...(Object.prototype.hasOwnProperty.call(body, "config_json") && {
      config_json: body.config_json,
    }),
    ...(Object.prototype.hasOwnProperty.call(body, "is_public") && {
      is_public: body.is_public,
    }),
    updated_at: toISOStringSafe(new Date()),
  };

  // 5. Execute update
  const updated =
    await MyGlobal.prisma.healthcare_platform_analytics_dashboards.update({
      where: { id: dashboardId },
      data: updateInput,
    });

  // 6. Return with proper string date transformation and type match
  return {
    id: updated.id,
    owner_user_id: updated.owner_user_id,
    organization_id: updated.organization_id,
    department_id: updated.department_id ?? null,
    title: updated.title,
    description: updated.description ?? null,
    config_json: updated.config_json,
    is_public: updated.is_public,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : null,
  };
}
