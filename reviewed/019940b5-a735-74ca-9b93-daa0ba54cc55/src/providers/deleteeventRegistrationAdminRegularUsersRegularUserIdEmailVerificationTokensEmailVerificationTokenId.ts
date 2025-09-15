import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Deletes an email verification token by its ID for a specific regular user.
 *
 * This operation permanently removes the token from the
 * event_registration_email_verification_tokens table. Only an admin user is
 * authorized to perform this action.
 *
 * @param props - Object containing the authenticated admin user and identifiers
 * @param props.admin - Authenticated admin performing the deletion
 * @param props.regularUserId - UUID of the target regular user
 * @param props.emailVerificationTokenId - UUID of the email verification token
 *   to delete
 * @throws {Error} If the token does not exist or does not belong to the
 *   specified user
 */
export async function deleteeventRegistrationAdminRegularUsersRegularUserIdEmailVerificationTokensEmailVerificationTokenId(props: {
  admin: AdminPayload;
  regularUserId: string & tags.Format<"uuid">;
  emailVerificationTokenId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, regularUserId, emailVerificationTokenId } = props;

  // Verify existence of the token for the given user
  const token =
    await MyGlobal.prisma.event_registration_email_verification_tokens.findFirst(
      {
        where: {
          id: emailVerificationTokenId,
          event_registration_regular_user_id: regularUserId,
        },
      },
    );

  if (!token) {
    throw new Error("Email verification token not found for this user");
  }

  // Delete the token
  await MyGlobal.prisma.event_registration_email_verification_tokens.delete({
    where: {
      id: emailVerificationTokenId,
    },
  });
}
