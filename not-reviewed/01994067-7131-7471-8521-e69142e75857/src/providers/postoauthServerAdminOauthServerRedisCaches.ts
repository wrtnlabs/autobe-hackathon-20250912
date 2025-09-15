import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerRedisCache } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerRedisCache";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create Redis cache configuration
 *
 * This operation creates a new Redis cache configuration record in the system,
 * storing metadata such as cache_name, prefix, TTL seconds, and description. It
 * requires administrative permission.
 *
 * @param props - Object containing admin authorization and body with cache
 *   details
 * @param props.admin - Authenticated admin payload making the request
 * @param props.body - Redis cache creation input data
 * @returns The newly created Redis cache configuration entity
 * @throws {Error} Throws if the creation fails due to database constraints
 */
export async function postoauthServerAdminOauthServerRedisCaches(props: {
  admin: AdminPayload;
  body: IOauthServerRedisCache.ICreate;
}): Promise<IOauthServerRedisCache> {
  const { admin, body } = props;

  const id = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.oauth_server_redis_caches.create({
    data: {
      id,
      cache_name: body.cache_name,
      prefix: body.prefix ?? null,
      ttl_seconds: body.ttl_seconds,
      description: body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    cache_name: created.cache_name,
    prefix: created.prefix ?? null,
    ttl_seconds: created.ttl_seconds,
    description: created.description ?? null,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
    deleted_at: created.deleted_at ?? null,
  };
}
