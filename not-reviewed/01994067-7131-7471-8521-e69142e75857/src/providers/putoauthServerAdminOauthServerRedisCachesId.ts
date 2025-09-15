import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerredisServerRedisCaches } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerredisServerRedisCaches";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing Redis cache configuration by its ID.
 *
 * This operation updates mutable cache properties like cache_name, prefix,
 * ttl_seconds, and description to manage OAuth server caching behavior.
 *
 * It verifies the cache exists and is not soft-deleted before update. It sets
 * the updated_at timestamp to the current ISO 8601 datetime.
 *
 * @param props - The parameters for update including the authenticated admin,
 *   cache config ID, and update data.
 * @param props.admin - The authenticated admin user performing the update.
 * @param props.id - UUID of the Redis cache configuration to update.
 * @param props.body - Partial update information for Redis cache configuration.
 * @returns The updated Redis cache configuration.
 * @throws {Error} If the config with given ID does not exist or is deleted.
 */
export async function putoauthServerAdminOauthServerRedisCachesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IOauthServerredisServerRedisCaches.IUpdate;
}): Promise<IOauthServerredisServerRedisCaches> {
  const { admin, id, body } = props;

  // Find existing config ensuring not soft deleted
  const existing = await MyGlobal.prisma.oauth_server_redis_caches.findUnique({
    where: { id },
  });

  if (!existing || existing.deleted_at !== null) {
    throw new Error(`Redis cache config not found or deleted: ${id}`);
  }

  // Build update data object, omit undefined
  const data: {
    cache_name?: string | null;
    ttl_seconds?: number;
    prefix?: string | null;
    description?: string | null;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };

  if (body.cache_name !== undefined) {
    data.cache_name = body.cache_name;
  }

  if (body.ttl_seconds !== undefined) {
    data.ttl_seconds = body.ttl_seconds;
  }

  if (body.prefix !== undefined) {
    data.prefix = body.prefix;
  }

  if (body.description !== undefined) {
    data.description = body.description;
  }

  // Update the redis cache config
  const updated = await MyGlobal.prisma.oauth_server_redis_caches.update({
    where: { id },
    data,
  });

  // Return the updated entity with date fields as ISO strings
  return {
    id: updated.id,
    cache_name: updated.cache_name,
    prefix: updated.prefix ?? null,
    ttl_seconds: updated.ttl_seconds,
    description: updated.description ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
