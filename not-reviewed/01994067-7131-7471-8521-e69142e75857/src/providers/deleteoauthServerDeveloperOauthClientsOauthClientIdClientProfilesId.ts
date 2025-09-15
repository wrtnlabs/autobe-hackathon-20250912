import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Delete one OAuth client profile record by client ID and profile ID.
 *
 * This operation permanently deletes the profile record identified by the
 * unique profile ID under the specified OAuth client ID. It verifies developer
 * authorization and client existence before deletion.
 *
 * @param props - Object containing the authenticated developer, OAuth client
 *   ID, and the client profile ID.
 * @param props.developer - The authenticated developer performing the deletion.
 * @param props.oauthClientId - Unique identifier of the OAuth client.
 * @param props.id - Unique identifier of the client profile to delete.
 * @returns Promise<void> resolves when deletion completes successfully.
 * @throws {Error} When the developer is not authorized.
 * @throws {Error} When the OAuth client does not exist or is deleted.
 * @throws {Error} When the client profile does not exist.
 */
export async function deleteoauthServerDeveloperOauthClientsOauthClientIdClientProfilesId(props: {
  developer: DeveloperPayload;
  oauthClientId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const developer = await MyGlobal.prisma.oauth_server_developers.findFirst({
    where: { id: props.developer.id, deleted_at: null },
  });

  if (!developer)
    throw new Error("Unauthorized: Developer not found or deleted");

  const oauthClient =
    await MyGlobal.prisma.oauth_server_oauth_clients.findFirst({
      where: { id: props.oauthClientId, deleted_at: null },
    });

  if (!oauthClient) throw new Error("OAuth client not found or deleted");

  const clientProfile =
    await MyGlobal.prisma.oauth_server_client_profiles.findFirst({
      where: { id: props.id, oauth_client_id: props.oauthClientId },
    });

  if (!clientProfile) throw new Error("OAuth client profile not found");

  await MyGlobal.prisma.oauth_server_client_profiles.delete({
    where: { id: props.id },
  });
}
