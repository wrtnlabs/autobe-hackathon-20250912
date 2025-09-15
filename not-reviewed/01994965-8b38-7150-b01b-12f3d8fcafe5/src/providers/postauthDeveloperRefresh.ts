import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDeveloper";

/**
 * Refresh JWT access token using a valid refresh token for developers.
 *
 * This operation validates the refresh token status linked to the developer
 * user and issues new JWT tokens for continued authenticated API access.
 *
 * It relies on the developer user identification stored in tokens associated
 * with the telegram_file_downloader_developers table.
 *
 * The operation does not require user credentials but mandates valid refresh
 * token possession.
 *
 * Successful response includes renewed authorized access reflecting the
 * developer's identity and role.
 *
 * @param props - Object containing the refresh token payload
 * @param props.body - Refresh token payload for renewing developer access
 *   tokens
 * @returns Authorized developer user information with renewed JWT tokens
 * @throws {Error} When the refresh token is invalid or expired
 * @throws {Error} When the developer user is not found
 */
export async function postauthDeveloperRefresh(props: {
  body: ITelegramFileDownloaderDeveloper.IRefresh;
}): Promise<ITelegramFileDownloaderDeveloper.IAuthorized> {
  const { body } = props;

  const decoded = jwt.verify(body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  });

  if (typeof decoded !== "object" || decoded === null || !("id" in decoded)) {
    throw new Error("Invalid refresh token payload");
  }

  // Type guard for id field
  typia.assertGuard<{ id: unknown }>(decoded);

  const developerId = decoded.id;
  if (typeof developerId !== "string") {
    throw new Error("Invalid developer id in token payload");
  }

  const developer =
    await MyGlobal.prisma.telegram_file_downloader_developers.findUnique({
      where: { id: developerId },
    });

  if (!developer) {
    throw new Error("Developer user not found");
  }

  const now = toISOStringSafe(new Date());
  const accessTokenExpire = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  ); // 1 hour
  const refreshTokenExpire = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  const accessToken = jwt.sign(
    { id: developer.id, email: developer.email, type: "developer" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    { id: developer.id, tokenType: "refresh", type: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: developer.id as string & tags.Format<"uuid">,
    email: developer.email,
    password_hash: developer.password_hash,
    created_at: toISOStringSafe(developer.created_at),
    updated_at: toISOStringSafe(developer.updated_at),
    deleted_at: developer.deleted_at
      ? toISOStringSafe(developer.deleted_at)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessTokenExpire,
      refreshable_until: refreshTokenExpire,
    },
  };
}
