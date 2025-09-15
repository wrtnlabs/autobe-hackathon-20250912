import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete a user point balance record from the OAuth server database. This
 * action irreversibly removes the record for compliance or cleanup purposes.
 *
 * This operation requires administrator privileges and performs a hard delete,
 * completely removing the record identified by the given unique id.
 *
 * @param props - Object containing the admin payload and the unique id of the
 *   user point record to delete
 * @param props.admin - The authenticated administrator making the deletion
 *   request
 * @param props.id - The UUID identifying the user point record to be deleted
 * @throws {Error} Throws if the specified user point record does not exist
 */
export async function deleteoauthServerAdminUserPointsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  // Authorization is handled by injected admin payload and middleware

  // Perform hard delete on oauth_server_user_points identified by id
  await MyGlobal.prisma.oauth_server_user_points.delete({
    where: { id },
  });
}
