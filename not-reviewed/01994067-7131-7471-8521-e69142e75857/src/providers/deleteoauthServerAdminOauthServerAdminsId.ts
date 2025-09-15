import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete an OAuth admin account.
 *
 * This operation marks an administrator user as deleted by setting the
 * `deleted_at` timestamp. It ensures the record remains for auditing but is
 * excluded from active use.
 *
 * Authorization: Requires the caller to be an authenticated admin.
 *
 * @param props - Operation props including authentication and target admin ID
 * @param props.admin - Authenticated admin user performing the delete
 * @param props.id - Unique identifier of the OAuth admin to soft delete
 * @throws {Error} When the admin user does not exist or is already deleted
 */
export async function deleteoauthServerAdminOauthServerAdminsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  // Find the active admin record
  const adminRecord = await MyGlobal.prisma.oauth_server_admins.findFirst({
    where: {
      id,
      deleted_at: null,
    },
  });

  if (!adminRecord) {
    throw new Error("OAuth admin user not found or already deleted");
  }

  // Soft delete by setting the deleted_at timestamp
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  await MyGlobal.prisma.oauth_server_admins.update({
    where: { id },
    data: { deleted_at: now },
  });
}
