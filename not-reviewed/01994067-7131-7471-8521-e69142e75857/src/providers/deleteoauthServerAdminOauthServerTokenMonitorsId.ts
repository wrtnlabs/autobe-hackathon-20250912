import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete an OAuth server token monitor record by ID.
 *
 * This operation permanently removes a token monitor audit event from the
 * database. It is restricted to admin users for security reasons.
 *
 * @param props - The function parameters.
 * @param props.admin - The authenticated admin performing the operation.
 * @param props.id - The UUID of the token monitor record to delete.
 * @throws {Error} Throws if the record does not exist or operation fails.
 */
export async function deleteoauthServerAdminOauthServerTokenMonitorsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  // Verify existence; throws if not found
  await MyGlobal.prisma.oauth_server_token_monitors.findUniqueOrThrow({
    where: { id },
  });

  // Perform permanent deletion
  await MyGlobal.prisma.oauth_server_token_monitors.delete({
    where: { id },
  });
}
