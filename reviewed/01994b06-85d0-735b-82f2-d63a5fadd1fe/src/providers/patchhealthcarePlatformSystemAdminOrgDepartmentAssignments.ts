import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOrgDepartmentAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrgDepartmentAssignment";
import { IPageIHealthcarePlatformOrgDepartmentAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformOrgDepartmentAssignment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Get a filtered and paginated list of organization-department assignments.
 *
 * This operation retrieves assignment relationships between organizations and
 * departments in the platform, supporting advanced search, filtering,
 * pagination, and secure access. Only non-deleted records (deleted_at is null)
 * are returned, and results include auditing metadata for compliance
 * operations. Sorting is supported on known columns and pagination is enforced
 * according to API contract. The caller must be an authenticated system
 * administrator; role checks are performed by the controller/decorator.
 *
 * @param props - Request properties
 * @param props.systemAdmin - The authenticated system admin making the request
 * @param props.body - Filtering, sorting, and pagination parameters for
 *   assignment records
 * @returns Paginated summary list of organization-department assignments and
 *   page information
 * @throws {Error} If unexpected server/database errors occur
 */
export async function patchhealthcarePlatformSystemAdminOrgDepartmentAssignments(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformOrgDepartmentAssignment.IRequest;
}): Promise<IPageIHealthcarePlatformOrgDepartmentAssignment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const allowedOrderBys = [
    "id",
    "healthcare_platform_organization_id",
    "healthcare_platform_department_id",
    "created_at",
    "updated_at",
  ];
  const rawOrderBy = props.body.orderBy ?? "created_at";
  const orderByField = allowedOrderBys.includes(rawOrderBy)
    ? rawOrderBy
    : "created_at";
  const sortDirection = props.body.direction === "asc" ? "asc" : "desc";

  const where = {
    deleted_at: null,
    ...(props.body.healthcare_platform_organization_id !== undefined && {
      healthcare_platform_organization_id:
        props.body.healthcare_platform_organization_id,
    }),
    ...(props.body.healthcare_platform_department_id !== undefined && {
      healthcare_platform_department_id:
        props.body.healthcare_platform_department_id,
    }),
    ...((props.body.created_at_from !== undefined ||
      props.body.created_at_to !== undefined) && {
      created_at: {
        ...(props.body.created_at_from !== undefined && {
          gte: props.body.created_at_from,
        }),
        ...(props.body.created_at_to !== undefined && {
          lte: props.body.created_at_to,
        }),
      },
    }),
    ...((props.body.updated_at_from !== undefined ||
      props.body.updated_at_to !== undefined) && {
      updated_at: {
        ...(props.body.updated_at_from !== undefined && {
          gte: props.body.updated_at_from,
        }),
        ...(props.body.updated_at_to !== undefined && {
          lte: props.body.updated_at_to,
        }),
      },
    }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_org_department_assignments.findMany({
      where,
      orderBy: { [orderByField]: sortDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_org_department_assignments.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      healthcare_platform_organization_id:
        row.healthcare_platform_organization_id,
      healthcare_platform_department_id: row.healthcare_platform_department_id,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
