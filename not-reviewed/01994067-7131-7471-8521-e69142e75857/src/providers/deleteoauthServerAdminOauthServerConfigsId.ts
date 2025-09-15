import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete an OAuth server config by id
 *
 * Deletes a system configuration record from the OAuth server's settings
 * permanently based on id. Requires administrative authorization.
 *
 * @param props - The parameters containing admin authentication payload and
 *   config id
 * @param props.admin - The authenticated admin user performing deletion
 * @param props.id - UUID of the config record to delete
 * @throws {Error} Throws if the record does not exist or is already deleted
 */
export async function deleteoauthServerAdminOauthServerConfigsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, id } = props;

  const existing = await MyGlobal.prisma.oauth_server_configs.findFirst({
    where: { id, deleted_at: null },
  });

  if (!existing) {
    throw new Error(`OAuth server config not found or already deleted: ${id}`);
  }

  await MyGlobal.prisma.oauth_server_configs.delete({
    where: { id },
  });
}
