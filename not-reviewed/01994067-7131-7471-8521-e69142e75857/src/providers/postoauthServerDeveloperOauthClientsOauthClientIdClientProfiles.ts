import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerClientProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerClientProfile";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Create a new OAuth client profile for a specified OAuth client.
 *
 * This operation allows authenticated developers to add metadata such as a
 * nickname and an optional description to an OAuth client. It verifies that the
 * target OAuth client exists and is active (not deleted) before creating the
 * profile.
 *
 * @param props - The input properties including the authenticated developer,
 *   the OAuth client ID, and the profile creation data.
 * @param props.developer - The authenticated developer making the request.
 * @param props.oauthClientId - The UUID of the OAuth client under which to
 *   create the profile.
 * @param props.body - The profile creation payload including nickname and
 *   optional description.
 * @returns The newly created OAuth client profile with all relevant metadata
 *   and timestamps.
 * @throws {Error} If the target OAuth client does not exist or is soft deleted.
 */
export async function postoauthServerDeveloperOauthClientsOauthClientIdClientProfiles(props: {
  developer: DeveloperPayload;
  oauthClientId: string & tags.Format<"uuid">;
  body: IOauthServerClientProfile.ICreate;
}): Promise<IOauthServerClientProfile> {
  const { developer, oauthClientId, body } = props;

  const existingClient =
    await MyGlobal.prisma.oauth_server_oauth_clients.findFirst({
      where: {
        id: oauthClientId,
        deleted_at: null,
      },
    });

  if (!existingClient) {
    throw new Error(
      `OAuth client with id ${oauthClientId} not found or deleted.`,
    );
  }

  const newProfileId = v4();
  const now = toISOStringSafe(new Date());

  const createdProfile =
    await MyGlobal.prisma.oauth_server_client_profiles.create({
      data: {
        id: newProfileId,
        oauth_client_id: oauthClientId,
        nickname: body.nickname,
        description: body.description !== undefined ? body.description : null,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: createdProfile.id,
    oauth_client_id: createdProfile.oauth_client_id,
    nickname: createdProfile.nickname,
    description:
      createdProfile.description === null ? null : createdProfile.description,
    deleted_at: createdProfile.deleted_at
      ? toISOStringSafe(createdProfile.deleted_at)
      : null,
    created_at: toISOStringSafe(createdProfile.created_at),
    updated_at: toISOStringSafe(createdProfile.updated_at),
  };
}
