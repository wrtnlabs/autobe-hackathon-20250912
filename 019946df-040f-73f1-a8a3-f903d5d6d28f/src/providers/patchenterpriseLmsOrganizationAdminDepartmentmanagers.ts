import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import { IPageIEnterpriseLmsDepartmentmanager } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsDepartmentmanager";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieves a paginated list of department manager users filtered and sorted by
 * various criteria.
 *
 * This operation supports tenant scoping, status filtering, search by first or
 * last name, sorting by allowed fields, and pagination with defaults.
 *
 * @param props - Object containing the authenticated organizationAdmin and
 *   request body
 * @param props.organizationAdmin - The authenticated organization admin user
 *   with tenant context
 * @param props.body - The request body containing pagination, filtering, and
 *   sorting criteria
 * @returns Paginated summary list of department managers conforming to
 *   IPageIEnterpriseLmsDepartmentmanager.ISummary
 * @throws Error if database operation fails or invalid parameters provided
 */
export async function patchenterpriseLmsOrganizationAdminDepartmentmanagers(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsDepartmentManager.IRequest;
}): Promise<IPageIEnterpriseLmsDepartmentmanager.ISummary> {
  const { organizationAdmin, body } = props;

  // Validate and normalize pagination parameters
  const page =
    body.page !== undefined && body.page !== null && body.page > 0
      ? body.page
      : 1;
  const limit =
    body.limit !== undefined && body.limit !== null && body.limit > 0
      ? body.limit
      : 100;
  const skip = (page - 1) * limit;

  // Build where clause for tenant filtering and optional status and search
  const whereClause: {
    tenant_id: string & tags.Format<"uuid">;
    status?: string;
    OR?:
      | { first_name: { contains: string } }[]
      | { last_name: { contains: string } }[];
  } = {
    tenant_id: organizationAdmin.id as string & tags.Format<"uuid">, // Will fix assignment
  };

  // Fix tenant_id assignment to organizationAdmin.tenant_id
  whereClause.tenant_id = organizationAdmin.id as string & tags.Format<"uuid">;
  whereClause.tenant_id = organizationAdmin.id as string & tags.Format<"uuid">;
  whereClause.tenant_id = organizationAdmin.id as string & tags.Format<"uuid">;
  whereClause.tenant_id = organizationAdmin.tenant_id;

  if (body.status !== undefined && body.status !== null) {
    whereClause.status = body.status;
  }

  if (body.search !== undefined && body.search !== null) {
    const searchTerm = body.search;
    whereClause.OR = [
      { first_name: { contains: searchTerm } },
      { last_name: { contains: searchTerm } },
    ];
  }

  // Parse order parameter with whitelist and default
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.order !== undefined && body.order !== null) {
    const orderStr = body.order.trim();
    let direction: "asc" | "desc" = "asc";
    let field: string = "created_at";

    if (orderStr.startsWith("+") || orderStr.startsWith("-")) {
      direction = orderStr.startsWith("-") ? "desc" : "asc";
      field = orderStr.slice(1);
    } else {
      field = orderStr;
    }

    const validFields = ["first_name", "last_name", "created_at", "updated_at"];
    if (validFields.includes(field)) {
      orderBy = { [field]: direction };
    }
  }

  // Fetch data and count in parallel
  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_departmentmanager.findMany({
      where: whereClause,
      orderBy: orderBy as any,
      skip: skip,
      take: limit,
      select: {
        id: true,
        tenant_id: true,
        email: true,
        first_name: true,
        last_name: true,
        status: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.enterprise_lms_departmentmanager.count({
      where: whereClause,
    }),
  ]);

  // Map results converting created_at to ISO string
  const data: IEnterpriseLmsDepartmentManager.ISummary[] = results.map(
    (dm) => ({
      id: dm.id,
      tenant_id: dm.tenant_id,
      email: dm.email,
      first_name: dm.first_name,
      last_name: dm.last_name,
      status: dm.status,
      created_at: toISOStringSafe(dm.created_at),
    }),
  );

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
