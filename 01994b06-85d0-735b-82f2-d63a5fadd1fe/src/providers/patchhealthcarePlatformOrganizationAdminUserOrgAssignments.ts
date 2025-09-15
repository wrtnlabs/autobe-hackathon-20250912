import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";
import { IPageIHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformUserOrgAssignment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and paginate user-organization assignment records
 * (healthcare_platform_user_org_assignments).
 *
 * This endpoint allows organization admins to search, filter, and page through
 * user-organization-role assignments in their own organization. Supports
 * filtering by user, role code, and assignment status, with sorting and
 * pagination. Results are always restricted to the admin's own organization,
 * and date fields are always returned as branded ISO strings. Soft-deleted
 * assignments are included if exist.
 *
 * @param props - Object containing:
 *
 *   - OrganizationAdmin: The authenticated organization admin
 *       (OrganizationadminPayload) for access control and context
 *   - Body: Filter, sort, and pagination controls
 *       (IHealthcarePlatformUserOrgAssignment.IRequest)
 *
 * @returns Paginated, filtered list of user-organization-role assignments for
 *   current org
 * @throws {Error} If organization admin is invalid (should not occur due to
 *   decorator enforcement), or if a DB error occurs
 */
export async function patchhealthcarePlatformOrganizationAdminUserOrgAssignments(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformUserOrgAssignment.IRequest;
}): Promise<IPageIHealthcarePlatformUserOrgAssignment> {
  const { organizationAdmin, body } = props;

  // Default pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);

  // Allow only these fields for sorting
  const sortableFields = [
    "user_id",
    "role_code",
    "assignment_status",
    "created_at",
    "updated_at",
  ];
  let orderBy;
  if (body.sort) {
    const [field, order] = body.sort.trim().split(" ");
    if (sortableFields.includes(field)) {
      orderBy = { [field]: order === "asc" ? "asc" : "desc" };
    }
  }
  if (!orderBy) {
    orderBy = { created_at: "desc" };
  }

  // Compose dynamic where clause, always scoping to own org
  const where = {
    healthcare_platform_organization_id: organizationAdmin.id,
    ...(body.user_id !== undefined &&
      body.user_id !== null && { user_id: body.user_id }),
    ...(body.role_code !== undefined &&
      body.role_code !== null && { role_code: body.role_code }),
    ...(body.assignment_status !== undefined &&
      body.assignment_status !== null && {
        assignment_status: body.assignment_status,
      }),
  };

  // Query paginated results and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_user_org_assignments.findMany({
      where,
      orderBy,
      skip,
      take: Number(limit),
    }),
    MyGlobal.prisma.healthcare_platform_user_org_assignments.count({
      where,
    }),
  ]);

  // Map to DTO: convert all Date fields using toISOStringSafe(), handle nullable deleted_at
  const data = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    healthcare_platform_organization_id:
      row.healthcare_platform_organization_id,
    role_code: row.role_code,
    assignment_status: row.assignment_status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
