import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerClientProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerClientProfile";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Retrieve detailed information of the specified OAuth client profile by its
 * unique identifier for a given OAuth client.
 *
 * This endpoint supports detailed profile viewing, including nickname and
 * description fields.
 *
 * Security measures restrict access to authenticated developers associated with
 * the OAuth client. Data integrity is maintained by ensuring the profile
 * belongs to the specified client and has not been soft deleted.
 *
 * @param props - Object containing developer authentication and identifiers
 * @param props.developer - The authenticated developer payload making the
 *   request
 * @param props.oauthClientId - Unique identifier of the target OAuth client
 * @param props.id - Unique identifier of the OAuth client profile
 * @returns The OAuth client profile data matching the specified identifiers
 * @throws {Error} Throws if the client profile does not exist or unauthorized
 *   access
 */
export async function getoauthServerDeveloperOauthClientsOauthClientIdClientProfilesId(props: {
  developer: DeveloperPayload;
  oauthClientId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerClientProfile> {
  const record =
    await MyGlobal.prisma.oauth_server_client_profiles.findFirstOrThrow({
      where: {
        id: props.id,
        oauth_client_id: props.oauthClientId,
        deleted_at: null,
      },
    });

  return {
    id: record.id,
    oauth_client_id: record.oauth_client_id,
    nickname: record.nickname,
    description: record.description ?? null,
    deleted_at: record.deleted_at ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
