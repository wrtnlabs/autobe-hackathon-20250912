import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import { IPageIEnterpriseLmsOrganizationadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsOrganizationadmin";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and list organization administrators
 *
 * This operation retrieves a filtered and paginated list of organization
 * administrators belonging to the tenant of the authenticated organizationAdmin
 * user. Supports filtering by status, search text (email, first name, last
 * name), pagination, and orders results by creation time descending.
 *
 * Only active organizationAdmins can perform this search.
 *
 * @param props - Object containing authenticated organizationAdmin and search
 *   filters
 * @param props.organizationAdmin - Authenticated organizationAdmin user payload
 * @param props.body - Search criteria and pagination parameters
 * @returns Paginated list of organization administrator summaries
 * @throws {Error} When the authenticated organizationAdmin user is not active
 */
export async function patchenterpriseLmsOrganizationAdminOrganizationadmins(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IEnterpriseLmsOrganizationAdmin.IRequest;
}): Promise<IPageIEnterpriseLmsOrganizationadmin.ISummary> {
  const { organizationAdmin, body } = props;

  const currentAdmin =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUniqueOrThrow({
      where: { id: organizationAdmin.id },
    });

  if (currentAdmin.status !== "active") {
    throw new Error("Unauthorized: organizationAdmin is not active");
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  // Construct where clause
  let whereConditions: {
    tenant_id: string & tags.Format<"uuid">;
    status?: string;
    OR?:
      | { email: { contains: string } }
      | { first_name: { contains: string } }
      | { last_name: { contains: string } }[];
  } = {
    tenant_id: currentAdmin.tenant_id,
  };

  if (body.status !== undefined && body.status !== null) {
    whereConditions.status = body.status;
  }

  if (
    body.search !== undefined &&
    body.search !== null &&
    body.search.trim() !== ""
  ) {
    const searchValue = body.search.trim();
    whereConditions.OR = [
      { email: { contains: searchValue } },
      { first_name: { contains: searchValue } },
      { last_name: { contains: searchValue } },
    ];
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_organizationadmin.findMany({
      where: whereConditions,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
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
    MyGlobal.prisma.enterprise_lms_organizationadmin.count({
      where: whereConditions,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      tenant_id: item.tenant_id,
      email: item.email,
      first_name: item.first_name,
      last_name: item.last_name,
      status: item.status,
      created_at: toISOStringSafe(item.created_at),
    })),
  };
}
