import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationEmailVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationEmailVerificationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an email verification token for a specific regular user.
 *
 * This endpoint enables modification of an existing email verification token
 * record for a given regular user. Only administrators are authorized to
 * perform this update. The function validates ownership of the token by the
 * user.
 *
 * @param props - Object containing admin payload, regular user ID, email
 *   verification token ID, and update data
 * @returns The updated email verification token information
 * @throws {Error} When the token does not belong to the specified regular user
 * @throws {Error} When the token or regular user does not exist
 */
export async function puteventRegistrationAdminRegularUsersRegularUserIdEmailVerificationTokensEmailVerificationTokenId(props: {
  admin: AdminPayload;
  regularUserId: string & tags.Format<"uuid">;
  emailVerificationTokenId: string & tags.Format<"uuid">;
  body: IEventRegistrationEmailVerificationToken.IUpdate;
}): Promise<IEventRegistrationEmailVerificationToken> {
  const { admin, regularUserId, emailVerificationTokenId, body } = props;

  const token =
    await MyGlobal.prisma.event_registration_email_verification_tokens.findUniqueOrThrow(
      {
        where: { id: emailVerificationTokenId },
      },
    );

  if (token.event_registration_regular_user_id !== regularUserId) {
    throw new Error("Token does not belong to the specified regular user");
  }

  const updateData: IEventRegistrationEmailVerificationToken.IUpdate = {};

  if (body.expires_at !== undefined) {
    updateData.expires_at =
      body.expires_at === null ? undefined : body.expires_at;
  }

  if (body.created_at !== undefined) {
    updateData.created_at =
      body.created_at === null ? undefined : body.created_at;
  }

  const updated =
    await MyGlobal.prisma.event_registration_email_verification_tokens.update({
      where: { id: emailVerificationTokenId },
      data: updateData,
    });

  return {
    id: updated.id,
    event_registration_regular_user_id:
      updated.event_registration_regular_user_id,
    token: updated.token,
    expires_at: toISOStringSafe(updated.expires_at),
    created_at: toISOStringSafe(updated.created_at),
  };
}
