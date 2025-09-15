import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerClientProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerClientProfile";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Update an existing OAuth client profile by ID.
 *
 * This operation updates the specified OAuth client profile associated with the
 * given OAuth client ID. It allows developers to modify client metadata such as
 * nickname and description while ensuring the profile exists and has not been
 * soft-deleted.
 *
 * Authorization: Only authenticated developers authorized for the OAuth client
 * may perform this operation.
 *
 * @param props - Object containing developer payload, OAuth client ID, profile
 *   ID, and update body
 * @returns The updated OAuth client profile
 * @throws {Error} When OAuth client or profile does not exist or is
 *   soft-deleted
 */
export async function putoauthServerDeveloperOauthClientsOauthClientIdClientProfilesId(props: {
  developer: DeveloperPayload;
  oauthClientId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
  body: IOauthServerClientProfile.IUpdate;
}): Promise<IOauthServerClientProfile> {
  const { developer, oauthClientId, id, body } = props;

  // Verify the OAuth client exists and is not soft-deleted
  const client = await MyGlobal.prisma.oauth_server_oauth_clients.findFirst({
    where: {
      id: oauthClientId,
      deleted_at: null,
    },
  });

  if (!client) {
    throw new Error("OAuth client not found or has been deleted.");
  }

  // Verify the OAuth client profile exists and is not soft-deleted
  const profile = await MyGlobal.prisma.oauth_server_client_profiles.findFirst({
    where: {
      id,
      oauth_client_id: oauthClientId,
      deleted_at: null,
    },
  });

  if (!profile) {
    throw new Error("OAuth client profile not found or has been deleted.");
  }

  // Update the client profile
  const updated = await MyGlobal.prisma.oauth_server_client_profiles.update({
    where: { id },
    data: {
      nickname: body.nickname ?? undefined,
      description: body.description ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the updated profile, converting dates
  return {
    id: updated.id,
    oauth_client_id: updated.oauth_client_id,
    nickname: updated.nickname,
    description: updated.description ?? null,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
