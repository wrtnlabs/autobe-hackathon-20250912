import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAdministrator";

/**
 * Refreshes JWT authorization tokens for an authenticated administrator user.
 *
 * This endpoints accepts a valid refresh token and issues new access and
 * refresh tokens, maintaining session continuity securely without requiring a
 * full login.
 *
 * @param props - Object containing the request body with the refresh token.
 * @param props.body - Request payload containing the refresh token string.
 * @returns Authorized administrator user with refreshed JWT tokens.
 * @throws {Error} If the refresh token is invalid, expired, or administrator is
 *   not found.
 */
export async function postauthAdministratorRefresh(props: {
  body: ITelegramFileDownloaderAdministrator.IRefresh;
}): Promise<ITelegramFileDownloaderAdministrator.IAuthorized> {
  const { refresh_token } = props.body;

  // Step 1: Verify and decode refresh token
  const decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as { id: string & tags.Format<"uuid">; type: "administrator" };

  // Step 2: Retrieve administrator record
  const admin =
    await MyGlobal.prisma.telegram_file_downloader_administrators.findUniqueOrThrow(
      {
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          password_hash: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );

  // Step 3: Prepare issued at and expiration timestamps
  const now = toISOStringSafe(new Date());
  const expired_at = toISOStringSafe(new Date(Date.now() + 1000 * 60 * 60)); // 1 hour
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
  ); // 7 days

  // Step 4: Sign new access token
  const accessToken = jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      type: "administrator",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Step 5: Sign new refresh token
  const newRefreshToken = jwt.sign(
    {
      id: admin.id,
      type: "administrator",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Step 6: Return authorized administrator with token
  return {
    id: admin.id,
    email: admin.email,
    password_hash: admin.password_hash,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: newRefreshToken,
      expired_at,
      refreshable_until,
    },
  };
}
