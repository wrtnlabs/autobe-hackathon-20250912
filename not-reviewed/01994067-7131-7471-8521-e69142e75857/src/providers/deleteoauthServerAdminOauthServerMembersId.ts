import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete an OAuth server member by ID (hard delete).
 *
 * This operation permanently removes the OAuth member record identified by the
 * provided UUID. Soft delete is supported by the schema but this endpoint
 * enforces an unrecoverable hard delete.
 *
 * @param props - Object containing the authenticated admin and the member ID
 * @param props.admin - The authenticated admin performing the deletion
 * @param props.id - The UUID of the member to delete
 * @throws {Error} Throws if the member does not exist
 */
export async function deleteoauthServerAdminOauthServerMembersId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  // Confirm member exists or throw
  await MyGlobal.prisma.oauth_server_members.findUniqueOrThrow({
    where: { id },
  });

  // Perform hard delete
  await MyGlobal.prisma.oauth_server_members.delete({
    where: { id },
  });
}
