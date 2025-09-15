import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ISubscriptionRenewalGuardianGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianGuest";
import { GuestPayload } from "../decorators/payload/GuestPayload";

/**
 * Refreshes the JWT token for a guest user.
 *
 * Validates the provided refresh token to ensure it is a valid token for a
 * guest user. Returns new access and refresh tokens along with their expiry
 * metadata.
 *
 * @param props - Object containing the authenticated guest and the refresh
 *   token request body.
 * @param props.guest - The authenticated guest payload (contains guest id and
 *   type).
 * @param props.body - The request body containing the refresh token.
 * @returns A promise resolving to the authorized guest access tokens and
 *   metadata.
 * @throws {Error} When the refresh token is invalid or expired.
 * @throws {Error} When the corresponding guest user is not found.
 */
export async function postauthGuestRefresh(props: {
  guest: GuestPayload;
  body: ISubscriptionRenewalGuardianGuest.IRefreshRequest;
}): Promise<ISubscriptionRenewalGuardianGuest.IAuthorized> {
  const { guest, body } = props;

  // Verify and decode refresh token with strict validation
  const decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as {
    id: string;
    type: string;
    tokenType?: string;
  };

  if (decoded.type !== "guest") throw new Error("Invalid token type");

  // Lookup guest user in the database
  const guestUser =
    await MyGlobal.prisma.subscription_renewal_guardian_guest.findUnique({
      where: { id: decoded.id },
    });

  if (!guestUser) throw new Error("Guest user not found");

  // Generate new access token
  const nowMs = Date.now();
  const expiresInAccessMs = 3600 * 1000; // 1 hour in ms
  const expiresInRefreshMs = 7 * 24 * 3600 * 1000; // 7 days in ms

  const accessToken = jwt.sign(
    { id: guestUser.id, type: "guest" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    { id: guestUser.id, type: "guest", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Calculate expiry times for tokens
  const expiredAt = toISOStringSafe(new Date(nowMs + expiresInAccessMs));
  const refreshableUntil = toISOStringSafe(
    new Date(nowMs + expiresInRefreshMs),
  );

  // Return authorized token object
  return {
    id: guestUser.id,
    access_token: accessToken,
    refresh_token: refreshToken,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
