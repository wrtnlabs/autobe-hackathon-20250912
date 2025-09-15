import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a Redis cache configuration by ID in the OAuth Server system.
 *
 * This sets the deleted_at timestamp, disabling the cache configuration from
 * further use while retaining the record for auditing.
 *
 * Only users with admin role are authorized to perform this operation due to
 * its impact on caching behavior.
 *
 * @param props - Object containing admin authentication and the Redis cache
 *   configuration ID to delete.
 * @param props.admin - The authenticated admin performing the deletion.
 * @param props.id - UUID of the Redis cache configuration to be soft deleted.
 * @returns Void
 * @throws {Error} Throws if the Redis cache configuration does not exist or
 *   update fails.
 */
export async function deleteoauthServerAdminOauthServerRedisCachesId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  // Authorization is assumed to be handled by middleware/decorator

  // Get current timestamp as ISO string with branded type
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  await MyGlobal.prisma.oauth_server_redis_caches.update({
    where: { id },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
