import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserOrgAssignment";
import { IPageIHealthcarePlatformUserOrgAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformUserOrgAssignment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and paginate user-organization assignment records
 * (healthcare_platform_user_org_assignments).
 *
 * This endpoint retrieves a filtered, paginated list of user-organization-role
 * assignments from the healthcare_platform_user_org_assignments model. It
 * enables administrators to search, sort, and paginate assignments by user,
 * organization, role_code, and assignment_status, with proper RBAC enforcement.
 * System admins have full listing access and may use all filters and sorts
 * supported by the API.
 *
 * @param props - Request parameters
 * @param props.systemAdmin - Authenticated system admin payload (RBAC enforced)
 * @param props.body - Filter, pagination, and sort controls for the search
 * @returns Paginated, filtered list of assignment records
 * @throws Error if query fails, DB is inaccessible, or parameters are invalid
 */
export async function patchhealthcarePlatformSystemAdminUserOrgAssignments(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformUserOrgAssignment.IRequest;
}): Promise<IPageIHealthcarePlatformUserOrgAssignment> {
  const { systemAdmin, body } = props;

  // Only systemAdmin-authenticated users may access this endpoint (enforced at decorator/controller level)
  // No per-row filtering is needed at this layer

  // Pagination setup
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build where (always explicit about null/undefined distinction)
  const where = {
    ...(body.organization_id !== undefined && {
      healthcare_platform_organization_id: body.organization_id,
    }),
    ...(body.user_id !== undefined && { user_id: body.user_id }),
    ...(body.role_code !== undefined && { role_code: body.role_code }),
    ...(body.assignment_status !== undefined && {
      assignment_status: body.assignment_status,
    }),
  };

  // Restrict sort fields for predictable sorting; fallback to created_at desc
  const allowedFields = [
    "created_at",
    "updated_at",
    "role_code",
    "assignment_status",
  ];
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.sort) {
    const trimmed = body.sort.trim();
    if (trimmed.length > 0) {
      const parts = trimmed.split(/\s+/g);
      const field = parts[0];
      const direction =
        (parts[1] ?? "desc").toLowerCase() === "asc" ? "asc" : "desc";
      if (allowedFields.includes(field)) {
        orderBy = { [field]: direction };
      }
    }
  }

  // Fetch rows and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_user_org_assignments.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_user_org_assignments.count({ where }),
  ]);

  // Prepare data, always transform every date field using toISOStringSafe (never use native Date or as)
  const data = rows.map((row) => {
    const created_at = toISOStringSafe(row.created_at);
    const updated_at = toISOStringSafe(row.updated_at);
    return {
      id: row.id,
      user_id: row.user_id,
      healthcare_platform_organization_id:
        row.healthcare_platform_organization_id,
      role_code: row.role_code,
      assignment_status: row.assignment_status,
      created_at,
      updated_at,
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
