import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Delete OAuth server developer by ID
 *
 * Permanently erase the OAuth server developer record matching the given
 * identifier. This endpoint requires the caller to have 'developer' role
 * authorization. The developer is removed irreversibly from the system database
 * via hard delete.
 *
 * @param props - Object containing the authenticated developer and the ID of
 *   developer to delete
 * @param props.developer - The authenticated developer payload
 * @param props.id - UUID of the OAuth server developer to delete
 * @throws {Error} Throws if the developer record does not exist or deletion
 *   fails
 */
export async function deleteoauthServerDeveloperOauthServerDevelopersId(props: {
  developer: DeveloperPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { id } = props;

  await MyGlobal.prisma.oauth_server_developers.delete({
    where: { id },
  });
}
