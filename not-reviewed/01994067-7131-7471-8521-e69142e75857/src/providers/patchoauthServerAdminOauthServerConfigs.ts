import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerOauthServerConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerConfigs";
import { IPageIOauthServerOauthServerConfigs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerOauthServerConfigs";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve a filtered and paginated list of OAuth server configuration
 * settings.
 *
 * This endpoint allows administrators to list configuration items filtered by
 * partial matching on key, value, and description, and filtered by active
 * status (non-deleted). Pagination and sorting are supported to efficiently
 * manage large configuration sets.
 *
 * @param props - Object containing admin authentication and request body
 * @param props.admin - Authenticated admin user making the request
 * @param props.body - Filter criteria, pagination, and sorting options
 * @returns Paginated list of configuration summaries
 * @throws {Error} When database access fails or invalid parameters are provided
 */
export async function patchoauthServerAdminOauthServerConfigs(props: {
  admin: AdminPayload;
  body: IOauthServerOauthServerConfigs.IRequest;
}): Promise<IPageIOauthServerOauthServerConfigs.ISummary> {
  const { admin, body } = props;
  const {
    key,
    value,
    description,
    is_active,
    page = 1,
    limit = 10,
    sortOrder = "desc",
    sortField,
  } = body;

  const where: {
    key?: { contains: string };
    value?: { contains: string };
    description?: { contains: string };
    deleted_at?: null | { not: null };
  } = {};

  if (key !== undefined && key !== null) {
    where.key = { contains: key };
  }
  if (value !== undefined && value !== null) {
    where.value = { contains: value };
  }
  if (description !== undefined && description !== null) {
    where.description = { contains: description };
  }
  if (is_active !== undefined && is_active !== null) {
    where.deleted_at = is_active ? null : { not: null };
  }

  const pageNum = Number(page) >= 1 ? Number(page) : 1;
  const limitNum = Number(limit) >= 1 ? Number(limit) : 10;
  const skip = (pageNum - 1) * limitNum;

  const orderField =
    typeof sortField === "string" && sortField.length > 0
      ? sortField
      : "created_at";
  const orderDirection = sortOrder === "asc" ? "asc" : "desc";

  const [configs, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_configs.findMany({
      where,
      orderBy: { [orderField]: orderDirection },
      skip,
      take: limitNum,
      select: {
        key: true,
        value: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.oauth_server_configs.count({ where }),
  ]);

  return {
    pagination: {
      current: pageNum,
      limit: limitNum,
      records: total,
      pages: Math.ceil(total / limitNum),
    },
    data: configs.map((item) => ({
      key: item.key,
      value: item.value ?? null,
      description: item.description ?? null,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
