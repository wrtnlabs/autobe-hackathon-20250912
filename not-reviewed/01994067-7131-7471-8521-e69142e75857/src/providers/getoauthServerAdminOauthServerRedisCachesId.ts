import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerRedisCache } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerRedisCache";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get Redis cache configuration detail by id for admin.
 *
 * This operation allows administrators to view full configuration details of a
 * Redis cache used within the OAuth server system. It fetches the Redis cache
 * configuration record identified by the provided UUID. Soft deleted records
 * (where deleted_at is not null) are excluded.
 *
 * @param props - Object containing admin user info and Redis cache id
 * @param props.admin - Authenticated admin user
 * @param props.id - UUID of the Redis cache configuration to fetch
 * @returns Detailed Redis cache configuration object
 * @throws Error if Redis cache with specified id does not exist or is soft
 *   deleted
 */
export async function getoauthServerAdminOauthServerRedisCachesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerRedisCache> {
  const { admin, id } = props;

  const cache =
    await MyGlobal.prisma.oauth_server_redis_caches.findFirstOrThrow({
      where: {
        id: id,
        deleted_at: null,
      },
    });

  return {
    id: cache.id,
    cache_name: cache.cache_name,
    prefix: cache.prefix ?? null,
    ttl_seconds: cache.ttl_seconds,
    description: cache.description ?? null,
    created_at: toISOStringSafe(cache.created_at),
    updated_at: toISOStringSafe(cache.updated_at),
    deleted_at: cache.deleted_at ? toISOStringSafe(cache.deleted_at) : null,
  };
}
