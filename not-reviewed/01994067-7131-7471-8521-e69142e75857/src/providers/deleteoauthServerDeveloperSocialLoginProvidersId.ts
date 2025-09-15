import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Delete a social login provider
 *
 * Permanently remove a social login provider from the system. This operation
 * cannot be undone and deletes all related OAuth configuration records.
 *
 * Only users with the "developer" role are authorized to execute this.
 *
 * Ensure no active integrations remain with the provider before deletion to
 * prevent OAuth flow disruptions.
 *
 * @param props - Object containing the developer payload and the social login
 *   provider ID
 * @param props.developer - Authenticated developer user performing the deletion
 * @param props.id - UUID of the social login provider to delete
 * @throws {Error} If the social login provider does not exist or deletion fails
 */
export async function deleteoauthServerDeveloperSocialLoginProvidersId(props: {
  developer: DeveloperPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { developer, id } = props;

  await MyGlobal.prisma.oauth_server_social_providers.delete({
    where: { id },
  });
}
