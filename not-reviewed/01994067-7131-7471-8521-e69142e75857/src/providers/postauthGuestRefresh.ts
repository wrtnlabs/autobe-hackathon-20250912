import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerGuest";
import { IOauthServerOauthServerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerGuest";

/**
 * Guest user token refresh operation.
 *
 * This function verifies the provided refresh token for a guest user, checks
 * the existence and active status of the guest user in the database, and issues
 * new JWT tokens with consistent payload structure for ephemeral guest
 * sessions.
 *
 * @param props - Object containing the refresh token in the request body
 * @param props.body.refresh_token - The refresh token string to validate
 * @returns New access and refresh tokens with expiration info
 * @throws {Error} When the refresh token is invalid, expired, or guest user not
 *   found
 */
export async function postauthGuestRefresh(props: {
  body: IOauthServerGuest.IRefresh;
}): Promise<IOauthServerOauthServerGuest.IAuthorized> {
  const { refresh_token } = props.body;

  // Verify the refresh token JWT and decode payload
  const decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as {
    id: string;
    type: string;
    tokenType?: string;
  };

  // Check that token is of type 'guest' and tokenType is 'refresh'
  if (decoded.type !== "guest" || decoded.tokenType !== "refresh") {
    throw new Error("Invalid token type: expected guest refresh token");
  }

  // Confirm guest user exists and is not soft deleted
  const guest = await MyGlobal.prisma.oauth_server_guests.findFirst({
    where: {
      id: decoded.id,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!guest) {
    throw new Error("Guest user not found or deleted");
  }

  // Define token expiration durations for ephemeral guest sessions
  const accessTokenExpiresInSeconds = 15 * 60; // 15 minutes
  const refreshTokenExpiresInSeconds = 60 * 60; // 60 minutes

  // Calculate expiration times as ISO date-time strings
  const nowMillis = Date.now();
  const accessExpiresAtISO = toISOStringSafe(
    new Date(nowMillis + accessTokenExpiresInSeconds * 1000),
  );
  const refreshExpiresAtISO = toISOStringSafe(
    new Date(nowMillis + refreshTokenExpiresInSeconds * 1000),
  );

  // Generate new JWT access token
  const accessToken = jwt.sign(
    {
      id: guest.id,
      type: "guest",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: accessTokenExpiresInSeconds,
      issuer: "autobe",
    },
  );

  // Generate new JWT refresh token
  const refreshToken = jwt.sign(
    {
      id: guest.id,
      type: "guest",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: refreshTokenExpiresInSeconds,
      issuer: "autobe",
    },
  );

  return {
    id: guest.id as string & tags.Format<"uuid">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAtISO,
      refreshable_until: refreshExpiresAtISO,
    },
  };
}
