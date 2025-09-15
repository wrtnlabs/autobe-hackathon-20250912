import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerDeveloper";

/**
 * Refresh JWT tokens for developer users to maintain authenticated session.
 *
 * This endpoint validates the provided refresh token and issues new access and
 * refresh tokens encoded as IOauthServerDeveloper.IAuthorized on success. It
 * implements token renewal without requiring re-login.
 *
 * @param props - Object containing the refresh token payload.
 * @param props.body - Request body containing the refresh token string.
 * @returns The authorized developer data including new JWT tokens.
 * @throws {Error} When the refresh token is invalid or the developer user is
 *   not found.
 */
export async function postauthDeveloperRefresh(props: {
  body: IOauthServerDeveloper.IRefresh;
}): Promise<IOauthServerDeveloper.IAuthorized> {
  const { refresh_token } = props.body;

  // Verify and decode the refresh token
  const decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as {
    userId: string & tags.Format<"uuid">;
  };

  // Find developer user by id, ensure not soft deleted
  const developer = await MyGlobal.prisma.oauth_server_developers.findFirst({
    where: { id: decoded.userId, deleted_at: null },
  });

  if (!developer) {
    throw new Error("Developer user not found");
  }

  // Prepare current time
  const now = toISOStringSafe(new Date());

  // Prepare access token payload matching login structure
  const tokenPayload = {
    id: developer.id,
    email: developer.email,
    email_verified: developer.email_verified,
    password_hash: developer.password_hash,
    created_at: toISOStringSafe(developer.created_at),
    updated_at: toISOStringSafe(developer.updated_at),
    deleted_at: developer.deleted_at
      ? toISOStringSafe(developer.deleted_at)
      : null,
  };

  // Create new JWT access token valid for 1 hour
  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
    expiresIn: "1h",
  });

  // Create new JWT refresh token valid for 7 days
  const refreshToken = jwt.sign(
    { userId: developer.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      issuer: "autobe",
      expiresIn: "7d",
    },
  );

  // Calculate expiration timestamps
  const accessTokenExp = new Date(
    Date.now() + 3600 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshTokenExp = new Date(
    Date.now() + 7 * 24 * 3600 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  // Return refreshed authorized developer info with tokens
  return {
    id: developer.id,
    email: developer.email,
    email_verified: developer.email_verified,
    password_hash: developer.password_hash,
    created_at: toISOStringSafe(developer.created_at),
    updated_at: toISOStringSafe(developer.updated_at),
    deleted_at: developer.deleted_at
      ? toISOStringSafe(developer.deleted_at)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessTokenExp,
      refreshable_until: refreshTokenExp,
    },
  };
}
