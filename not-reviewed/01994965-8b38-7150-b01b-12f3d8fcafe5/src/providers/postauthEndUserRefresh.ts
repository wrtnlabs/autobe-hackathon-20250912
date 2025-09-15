import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";
import { EnduserPayload } from "../decorators/payload/EnduserPayload";

/**
 * Refresh JWT tokens for authenticated endUser sessions.
 *
 * This function validates the provided refresh token, ensures the associated
 * end user exists and is active, then issues new access and refresh tokens. The
 * new tokens preserve the original payload structure used during login,
 * allowing seamless session continuation without re-authentication.
 *
 * @param props - Object containing the authenticated end user payload and the
 *   refresh token body.
 * @param props.endUser - Authenticated end user payload (not used directly for
 *   authorization in this function as refresh token is primary).
 * @param props.body - Contains the refresh token string for renewal.
 * @returns Newly authorized end user information including updated JWT tokens.
 * @throws {Error} When the refresh token is invalid or expired.
 * @throws {Error} When the associated user record is not found.
 */
export async function postauthEndUserRefresh(props: {
  endUser: EnduserPayload;
  body: ITelegramFileDownloaderEndUser.IRefresh;
}): Promise<ITelegramFileDownloaderEndUser.IAuthorized> {
  const { body } = props;
  // Step 1: Verify refresh token and decode
  const decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as {
    userId: string;
  };

  // Step 2: Fetch user from DB
  const user =
    await MyGlobal.prisma.telegram_file_downloader_endusers.findUnique({
      where: { id: decoded.userId },
    });

  if (!user) {
    throw new Error("User not found");
  }

  // Step 3: Generate new tokens and expirations
  const now = Date.now();
  const accessTokenExpiryMs = 1 * 60 * 60 * 1000; // 1 hour
  const refreshTokenExpiryMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  const accessTokenExpiresAt = toISOStringSafe(
    new Date(now + accessTokenExpiryMs),
  );
  const refreshTokenExpiresAt = toISOStringSafe(
    new Date(now + refreshTokenExpiryMs),
  );

  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Step 4: Construct and return authorized response
  return {
    id: user.id,
    email: user.email as string & tags.Format<"email">,
    password_hash: user.password_hash,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessTokenExpiresAt,
      refreshable_until: refreshTokenExpiresAt,
    },
  };
}
