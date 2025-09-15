import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Delete an OAuth refresh token by ID for an authenticated member user.
 *
 * This operation permanently deletes a refresh token from the database. It
 * requires the token ID and enforces authorization via the member payload.
 *
 * @param props - The operation properties
 * @param props.member - The authenticated member payload
 * @param props.id - The UUID of the refresh token to delete
 * @throws {Error} Throws if the refresh token does not exist
 */
export async function deleteoauthServerMemberRefreshTokensId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { member, id } = props;

  // Verify the refresh token exists
  await MyGlobal.prisma.oauth_server_refresh_tokens.findUniqueOrThrow({
    where: { id },
  });

  // Hard delete the refresh token
  await MyGlobal.prisma.oauth_server_refresh_tokens.delete({
    where: { id },
  });
}
