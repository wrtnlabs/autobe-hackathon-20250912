import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";
import { EnduserPayload } from "../decorators/payload/EnduserPayload";

/**
 * Reset password for endUser account securely
 *
 * Password reset operation for end users to securely change their password
 * after verification. Relies on telegram_file_downloader_endusers password_hash
 * field for updating credentials. Supports member-kind users in maintaining
 * account security via password recovery.
 *
 * @param props - Object containing endUser authentication info and body with
 *   reset data
 * @param props.endUser - The authenticated endUser payload (not used directly
 *   in this operation, but required for authentication context)
 * @param props.body - The reset password request body containing email and
 *   new_password
 * @returns Confirmation of password reset success or throws error if user not
 *   found
 * @throws {Error} When endUser with specified email does not exist
 */
export async function postauthEndUserPasswordReset(props: {
  endUser: EnduserPayload;
  body: ITelegramFileDownloaderEndUser.IResetPassword;
}): Promise<ITelegramFileDownloaderEndUser.IResetPasswordResponse> {
  const { body } = props;

  // Find the user by email and ensure not soft deleted
  const user =
    await MyGlobal.prisma.telegram_file_downloader_endusers.findFirst({
      where: { email: body.email, deleted_at: null },
    });

  if (!user) {
    throw new Error(`EndUser with email ${body.email} not found`);
  }

  // Hash the new password before storing
  const hashedPassword = await MyGlobal.password.hash(body.new_password);

  // Update the user's password_hash field
  await MyGlobal.prisma.telegram_file_downloader_endusers.update({
    where: { id: user.id },
    data: { password_hash: hashedPassword },
  });

  return {
    success: true,
    message: "Password has been reset successfully.",
  };
}
