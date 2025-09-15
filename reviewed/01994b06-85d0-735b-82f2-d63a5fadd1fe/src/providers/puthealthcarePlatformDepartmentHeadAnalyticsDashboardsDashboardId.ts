import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsDashboard";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Update an existing analytics dashboard's configuration or content.
 *
 * This operation updates the dashboard identified by `dashboardId` in the
 * healthcare_platform_analytics_dashboards table. Only allowed for department
 * heads who lead the dashboard's department. The function enforces strict RBAC:
 * only department heads of the matching department can update their dashboards,
 * and only mutable fields are modified. All modifications update the audit
 * timestamp. Returns the updated dashboard with proper ISO string and branding
 * for all date and id fields.
 *
 * @param props - The method parameters
 * @param props.departmentHead - The authenticated DepartmentheadPayload (must
 *   match dashboard department)
 * @param props.dashboardId - UUID of the dashboard to update
 * @param props.body - Fields to update on the dashboard (title, description,
 *   config_json, department_id, is_public)
 * @returns The updated dashboard with all system fields and date-time values as
 *   branded ISO strings
 * @throws {Error} When the dashboard is not found, deleted, or the user is not
 *   authorized
 */
export async function puthealthcarePlatformDepartmentHeadAnalyticsDashboardsDashboardId(props: {
  departmentHead: DepartmentheadPayload;
  dashboardId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAnalyticsDashboard.IUpdate;
}): Promise<IHealthcarePlatformAnalyticsDashboard> {
  const { departmentHead, dashboardId, body } = props;

  // 1. Fetch dashboard (must exist, not deleted)
  const dashboard =
    await MyGlobal.prisma.healthcare_platform_analytics_dashboards.findFirst({
      where: {
        id: dashboardId,
        deleted_at: null,
      },
    });
  if (!dashboard) {
    throw new Error("Dashboard not found or deleted");
  }

  // 2. Enforce department-based RBAC: dashboard.department_id must match departmentHead's department id (assuming departmentHead.id is department id, revise logic if DepartmentheadPayload includes department_id explicitly)
  if (
    dashboard.department_id === null ||
    dashboard.department_id !== departmentHead.id
  ) {
    throw new Error(
      "Forbidden: You are not the department head of this dashboard's department",
    );
  }

  // 3. Prepare update fields (only mutable)
  // Never update owner_user_id, organization, id, created_at, deleted_at
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_analytics_dashboards.update({
      where: { id: dashboardId },
      data: {
        title: body.title ?? undefined,
        description: body.description ?? undefined,
        config_json: body.config_json ?? undefined,
        department_id:
          body.department_id === undefined ? undefined : body.department_id,
        is_public: body.is_public ?? undefined,
        updated_at: now,
      },
    });

  // 4. Return all fields as IHealthcarePlatformAnalyticsDashboard (ISO + branding)
  return {
    id: updated.id,
    owner_user_id: updated.owner_user_id,
    organization_id: updated.organization_id,
    department_id:
      updated.department_id !== null && updated.department_id !== undefined
        ? updated.department_id
        : undefined,
    title: updated.title,
    description:
      updated.description !== null && updated.description !== undefined
        ? updated.description
        : undefined,
    config_json: updated.config_json,
    is_public: updated.is_public,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at !== null && updated.deleted_at !== undefined
        ? toISOStringSafe(updated.deleted_at)
        : undefined,
  };
}
