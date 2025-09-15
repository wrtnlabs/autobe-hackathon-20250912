import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsTenant";
import { IPageIEnterpriseLmsTenant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsTenant";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Searches and retrieves a paginated list of tenants.
 *
 * This operation provides search functionality for tenant code and name,
 * filtering based on creation and update date ranges, and supports filtering of
 * deleted or active tenants. It supports pagination and sorting.
 *
 * @param props - Object containing systemAdmin authorization and
 *   search/filtering criteria.
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request.
 * @param props.body - The search criteria and pagination parameters.
 * @returns A paginated summary list of tenants matching the criteria.
 * @throws {Error} If any unexpected error occurs during retrieval.
 */
export async function patchenterpriseLmsSystemAdminTenants(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsTenant.IRequest;
}): Promise<IPageIEnterpriseLmsTenant.ISummary> {
  const { systemAdmin, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 100) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where: {
    OR?: { code?: { contains: string }; name?: { contains: string } }[];
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
    updated_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
    deleted_at?: null | { not: null };
  } = {};

  if (body.search !== undefined && body.search !== null && body.search !== "") {
    where.OR = [
      { code: { contains: body.search } },
      { name: { contains: body.search } },
    ];
  }

  if (body.created_at_gte !== undefined && body.created_at_gte !== null) {
    where.created_at = where.created_at ?? {};
    where.created_at.gte = body.created_at_gte;
  }

  if (body.created_at_lte !== undefined && body.created_at_lte !== null) {
    where.created_at = where.created_at ?? {};
    where.created_at.lte = body.created_at_lte;
  }

  if (body.updated_at_gte !== undefined && body.updated_at_gte !== null) {
    where.updated_at = where.updated_at ?? {};
    where.updated_at.gte = body.updated_at_gte;
  }

  if (body.updated_at_lte !== undefined && body.updated_at_lte !== null) {
    where.updated_at = where.updated_at ?? {};
    where.updated_at.lte = body.updated_at_lte;
  }

  if (body.deleted !== undefined && body.deleted !== null) {
    if (body.deleted === true) {
      where.deleted_at = { not: null };
    } else {
      where.deleted_at = null;
    }
  }

  const allowedSortFields = ["code", "name", "created_at", "updated_at"];
  const sortField = allowedSortFields.includes(body.sort_field ?? "")
    ? (body.sort_field as "code" | "name" | "created_at" | "updated_at")
    : "created_at";

  const sortOrder =
    body.sort_order === "asc" || body.sort_order === "desc"
      ? body.sort_order
      : "asc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_tenants.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
      select: { id: true, code: true, name: true },
    }),
    MyGlobal.prisma.enterprise_lms_tenants.count({ where }),
  ]);

  const pages = Math.ceil(total / limit) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
    data: data.map((tenant) => ({
      id: tenant.id,
      code: tenant.code,
      name: tenant.name,
    })),
  };
}
