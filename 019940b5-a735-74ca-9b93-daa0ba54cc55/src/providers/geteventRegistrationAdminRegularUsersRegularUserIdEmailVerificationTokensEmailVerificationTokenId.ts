import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEmailVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEmailVerificationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves a specific email verification token for a given regular user.
 *
 * This operation fetches the token record from
 * `event_registration_email_verification_tokens` table using the provided token
 * ID and regular user ID. It throws an error if the token does not exist.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user making the request
 * @param props.regularUserId - UUID of the regular user who owns the token
 * @param props.emailVerificationTokenId - UUID of the email verification token
 *   to fetch
 * @returns The detailed email verification token information
 * @throws {Error} When the token is not found for the given user
 */
export async function geteventRegistrationAdminRegularUsersRegularUserIdEmailVerificationTokensEmailVerificationTokenId(props: {
  admin: AdminPayload;
  regularUserId: string & tags.Format<"uuid">;
  emailVerificationTokenId: string & tags.Format<"uuid">;
}): Promise<IEventRegistrationEmailVerificationToken> {
  const { admin, regularUserId, emailVerificationTokenId } = props;

  const token =
    await MyGlobal.prisma.event_registration_email_verification_tokens.findFirstOrThrow(
      {
        where: {
          id: emailVerificationTokenId,
          event_registration_regular_user_id: regularUserId,
        },
      },
    );

  return {
    id: token.id,
    event_registration_regular_user_id:
      token.event_registration_regular_user_id,
    token: token.token,
    expires_at: toISOStringSafe(token.expires_at),
    created_at: toISOStringSafe(token.created_at),
  };
}
