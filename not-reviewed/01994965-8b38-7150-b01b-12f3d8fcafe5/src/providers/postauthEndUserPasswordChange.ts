import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";
import { EnduserPayload } from "../decorators/payload/EnduserPayload";

/**
 * Change password for authenticated end user securely.
 *
 * This provider function handles verification of the current password and
 * updates the stored password hash. It ensures the user is active and
 * authenticated, then performs a safe password hash update.
 *
 * @param props - Object containing authenticated end user and password change
 *   body
 * @param props.endUser - The authenticated end user payload identifying the
 *   user
 * @param props.body - Object containing current_password and new_password
 *   fields
 * @returns Result indicating success or failure of the password change
 *   operation
 * @throws {Error} When the user does not exist or is soft deleted
 * @throws {Error} When the current password provided is incorrect
 */
export async function postauthEndUserPasswordChange(props: {
  endUser: EnduserPayload;
  body: ITelegramFileDownloaderEndUser.IChangePassword;
}): Promise<ITelegramFileDownloaderEndUser.IChangePasswordResponse> {
  const { endUser, body } = props;

  // Locate the active end user record
  const user =
    await MyGlobal.prisma.telegram_file_downloader_endusers.findFirst({
      where: {
        id: endUser.id,
        deleted_at: null,
      },
    });

  if (!user) throw new Error("User not found");

  // Validate the current password against stored hash
  const isValidCurrent = await MyGlobal.password.verify(
    body.current_password,
    user.password_hash,
  );
  if (!isValidCurrent) throw new Error("Current password incorrect");

  // Compute the new password hash
  const newHash = await MyGlobal.password.hash(body.new_password);

  // Record current timestamp for updated_at
  const now = toISOStringSafe(new Date());

  // Update the user's password hash and updated timestamp
  await MyGlobal.prisma.telegram_file_downloader_endusers.update({
    where: { id: endUser.id },
    data: {
      password_hash: newHash,
      updated_at: now,
    },
  });

  // Return success response
  return {
    success: true,
    message: "Password changed successfully",
  };
}
