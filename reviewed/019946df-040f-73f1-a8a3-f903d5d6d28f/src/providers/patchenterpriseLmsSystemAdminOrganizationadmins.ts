import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";
import { IPageIEnterpriseLmsOrganizationadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsOrganizationadmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Searches organization administrators with filtering, pagination and sorting.
 *
 * Supports searching by tenant, status, email and name fields. Only active
 * (non-deleted) records are considered.
 *
 * Authorization is assumed provided by upstream systemAdmin authentication.
 *
 * @param props - Object containing systemAdmin and request body for filters and
 *   pagination
 * @param props.systemAdmin - The authenticated system admin user payload
 * @param props.body - Search criteria and pagination controls
 * @returns A paginated summary of organization administrators matching the
 *   filters
 * @throws {Error} Throws if database operation fails or invalid parameters
 *   provided
 */
export async function patchenterpriseLmsSystemAdminOrganizationadmins(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsOrganizationAdmin.IRequest;
}): Promise<IPageIEnterpriseLmsOrganizationadmin.ISummary> {
  const { systemAdmin, body } = props;

  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 10);
  const skip = (page - 1) * limit;

  if (page < 1) throw new Error("Page number must be greater than 0");
  if (limit < 1) throw new Error("Limit must be greater than 0");

  const whereConditions: {
    deleted_at: null;
    tenant_id?: string & tags.Format<"uuid">;
    status?: string;
    OR?: {
      email?: { contains: string };
      first_name?: { contains: string };
      last_name?: { contains: string };
    }[];
  } = {
    deleted_at: null,
  };

  if (body.tenant_id !== undefined && body.tenant_id !== null) {
    whereConditions.tenant_id = body.tenant_id;
  }
  if (body.status !== undefined && body.status !== null) {
    whereConditions.status = body.status;
  }
  if (body.search !== undefined && body.search !== null) {
    whereConditions.OR = [
      { email: { contains: body.search } },
      { first_name: { contains: body.search } },
      { last_name: { contains: body.search } },
    ];
  }

  const [records, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_organizationadmin.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
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
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      tenant_id: record.tenant_id,
      email: record.email,
      first_name: record.first_name,
      last_name: record.last_name,
      status: record.status,
      created_at: toISOStringSafe(record.created_at),
    })),
  };
}
