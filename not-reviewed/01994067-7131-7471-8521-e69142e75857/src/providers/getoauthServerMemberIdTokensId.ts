import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerIdToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerIdToken";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Retrieve details of an OAuth ID token identified by ID.
 *
 * This operation fetches a specific OAuth ID token from the
 * oauth_server_id_tokens table by its unique UUID identifier. The returned
 * object includes the token string, expiration, client association, and
 * timestamps.
 *
 * Authorization requires an authenticated member user.
 *
 * @param props - An object containing the authenticated member payload and the
 *   ID token's UUID.
 * @param props.member - The authenticated member payload.
 * @param props.id - The UUID of the OAuth ID token to retrieve.
 * @returns The detailed OAuth ID token record as defined by
 *   IOauthServerIdToken.
 * @throws {Error} Throws if no token with the specified ID exists.
 */
export async function getoauthServerMemberIdTokensId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IOauthServerIdToken> {
  const { member, id } = props;

  const record = await MyGlobal.prisma.oauth_server_id_tokens.findUniqueOrThrow(
    {
      where: { id },
      select: {
        id: true,
        oauth_client_id: true,
        authorization_code_id: true,
        token: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );

  return {
    id: record.id,
    oauth_client_id: record.oauth_client_id,
    authorization_code_id:
      record.authorization_code_id === null
        ? null
        : record.authorization_code_id,
    token: record.token,
    expires_at: toISOStringSafe(record.expires_at),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
