import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Soft-delete an analytics dashboard by dashboardId (department head scope).
 *
 * This function soft-deletes an analytics dashboard in the
 * healthcare_platform_analytics_dashboards table by marking its deleted_at
 * field with the current timestamp as an ISO string. Only the dashboard owner
 * can perform this operation within the department head context, as there is no
 * direct reference to department heads in the schema for cross-department
 * deletion.
 *
 * @param props - Request props
 * @param props.departmentHead - Authenticated department head user
 *   (DepartmentheadPayload)
 * @param props.dashboardId - Unique dashboard UUID to soft-delete
 * @returns Void
 * @throws {Error} If the dashboard does not exist, is already deleted, or the
 *   user is not authorized
 */
export async function deletehealthcarePlatformDepartmentHeadAnalyticsDashboardsDashboardId(props: {
  departmentHead: DepartmentheadPayload;
  dashboardId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { departmentHead, dashboardId } = props;

  // 1. Find dashboard, must not be deleted
  const dashboard =
    await MyGlobal.prisma.healthcare_platform_analytics_dashboards.findFirst({
      where: {
        id: dashboardId,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_user_id: true,
        department_id: true,
      },
    });
  if (!dashboard) throw new Error("Dashboard not found or already deleted");

  // 2. Authorization: Only owner can delete (no department head link in schema)
  if (dashboard.owner_user_id !== departmentHead.id) {
    throw new Error("Unauthorized: Only the owner can delete this dashboard");
  }

  // 3. Soft delete
  await MyGlobal.prisma.healthcare_platform_analytics_dashboards.update({
    where: { id: dashboardId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
