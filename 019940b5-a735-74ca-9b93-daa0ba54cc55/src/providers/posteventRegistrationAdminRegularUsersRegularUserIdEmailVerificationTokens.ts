import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEmailVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEmailVerificationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new email verification token for a specific regular user.
 *
 * This operation inserts a unique token linked to the user ID into the
 * event_registration_email_verification_tokens table, supporting email
 * verification workflows.
 *
 * @param props - Object containing admin credentials, the user ID, and the
 *   token creation data
 * @param props.admin - The authenticated admin making the request
 * @param props.regularUserId - UUID of the regular user to associate the token
 *   with
 * @param props.body - The token creation information including token string and
 *   expiry
 * @returns The newly created email verification token record
 * @throws {Error} Throws if the database operation fails
 */
export async function posteventRegistrationAdminRegularUsersRegularUserIdEmailVerificationTokens(props: {
  admin: AdminPayload;
  regularUserId: string & tags.Format<"uuid">;
  body: IEventRegistrationEmailVerificationToken.ICreate;
}): Promise<IEventRegistrationEmailVerificationToken> {
  const id = v4() as string & tags.Format<"uuid">;
  const createdAt = props.body.created_at ?? toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.event_registration_email_verification_tokens.create({
      data: {
        id,
        event_registration_regular_user_id: props.regularUserId,
        token: props.body.token,
        expires_at: props.body.expires_at,
        created_at: createdAt,
      },
    });

  return {
    id: created.id,
    event_registration_regular_user_id:
      created.event_registration_regular_user_id,
    token: created.token,
    expires_at: toISOStringSafe(created.expires_at),
    created_at: toISOStringSafe(created.created_at),
  };
}
