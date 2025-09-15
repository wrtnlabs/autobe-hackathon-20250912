import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerRedisCache } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerRedisCache";
import { IPageIOauthServerRedisCache } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIOauthServerRedisCache";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * List Redis cache configurations with filters and pagination.
 *
 * This operation offers system administrators the ability to query Redis cache
 * settings applied for OAuth token verification caching, user info caching,
 * external API response caching, and client info caching.
 *
 * Results include detailed cache names, TTL settings, prefixes, and
 * descriptions.
 *
 * Request body must specify search filters and pagination options.
 *
 * The response provides a paginated list of cache configuration summaries.
 *
 * Admin role authorization is required due to sensitive system settings access.
 *
 * @param props - Object containing admin authentication and request body
 *   filter/pagination.
 * @param props.admin - The authenticated admin user making the request.
 * @param props.body - Request body containing filter and pagination parameters
 *   of type IOauthServerRedisCache.IRequest.
 * @returns Paginated list of Redis cache summaries matching the search
 *   criteria.
 * @throws {Error} When database query fails or unexpected error occurs.
 */
export async function patchoauthServerAdminOauthServerRedisCaches(props: {
  admin: AdminPayload;
  body: IOauthServerRedisCache.IRequest;
}): Promise<IPageIOauthServerRedisCache.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> &
    tags.JsonSchemaPlugin<{ format: "uint32" }>;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> &
    tags.JsonSchemaPlugin<{ format: "uint32" }>;

  const where: {
    cache_name?: { contains: string };
    prefix?: string | null | { contains: string };
    ttl_seconds?: number;
    description?: string | null | { contains: string };
    deleted_at: null | (string & tags.Format<"date-time">);
  } = {
    deleted_at: null,
  };

  if (body.cache_name !== undefined && body.cache_name !== null) {
    where.cache_name = { contains: body.cache_name };
  }

  if (body.prefix !== undefined) {
    if (body.prefix === null) {
      where.prefix = null;
    } else {
      where.prefix = { contains: body.prefix };
    }
  }

  if (body.ttl_seconds !== undefined && body.ttl_seconds !== null) {
    where.ttl_seconds = body.ttl_seconds as number &
      tags.Type<"int32"> &
      tags.JsonSchemaPlugin<{ format: "int32" }>;
  }

  if (body.description !== undefined) {
    if (body.description === null) {
      where.description = null;
    } else {
      where.description = { contains: body.description };
    }
  }

  if (body.deleted_at !== undefined && body.deleted_at !== null) {
    where.deleted_at = body.deleted_at;
  }

  const sortBy =
    body.sortBy === undefined ||
    body.sortBy === null ||
    ["cache_name", "ttl_seconds", "created_at", "updated_at"].includes(
      body.sortBy,
    )
      ? (body.sortBy ?? "created_at")
      : "created_at";
  const sortDirection =
    body.sortDirection === "ASC"
      ? "asc"
      : body.sortDirection === "DESC"
        ? "desc"
        : "desc";

  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.oauth_server_redis_caches.findMany({
      where: where,
      orderBy: {
        [sortBy]: sortDirection,
      },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.oauth_server_redis_caches.count({
      where: where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((cache) => ({
      cache_name: cache.cache_name,
      prefix: cache.prefix === null ? null : (cache.prefix ?? undefined),
      ttl_seconds: cache.ttl_seconds,
      description:
        cache.description === null ? null : (cache.description ?? undefined),
    })),
  };
}
