import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerGuest";
import { IOauthServerOauthServerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerGuest";

/**
 * Guest user registration creating a temporary guest account.
 *
 * This operation registers a guest user by creating a new record in the
 * oauth_server_guests table with a generated UUID. It issues temporary JWT
 * tokens for guest access without credentials. Tokens have short expiration to
 * align with ephemeral guest session policies.
 *
 * This endpoint is public and requires no authentication.
 *
 * @param props - Request body containing guest creation data (empty object)
 * @returns The authorized guest user ID with JWT token details
 * @throws {Error} If database operation or token generation fails
 */
export async function postauthGuestJoin(props: {
  body: IOauthServerGuest.ICreate;
}): Promise<IOauthServerOauthServerGuest.IAuthorized> {
  // Generate new guest ID
  const guestId = v4() as string & tags.Format<"uuid">;

  // Create guest record in the database
  await MyGlobal.prisma.oauth_server_guests.create({
    data: {
      id: guestId,
    },
  });

  // Current timestamp as ISO string
  const now = toISOStringSafe(new Date());

  // Calculate expiration timestamps for tokens
  const expiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  // Generate JWT access token
  const accessToken = jwt.sign(
    {
      id: guestId,
      type: "guest",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate JWT refresh token
  const refreshToken = jwt.sign(
    {
      id: guestId,
      type: "guest",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return authorized guest data
  return {
    id: guestId,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
