import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ISubscriptionRenewalGuardianUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianUser";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Refresh JWT tokens for a logged-in user of role 'user', accepting a valid
 * refresh token and issuing new access tokens. Requires authenticated refresh
 * token.
 *
 * This operation verifies the provided refresh token, fetches the associated
 * user, and issues new JWT access and refresh tokens with matching payload
 * structures. It returns the user's authorization information along with the
 * new tokens and their expiration timestamps.
 *
 * @param props - Object containing the authenticated user payload and refresh
 *   token body
 * @param props.user - The authenticated user performing the refresh (currently
 *   unused but required by contract)
 * @param props.body - Request body containing the refresh token string
 * @returns The updated authorization information including new tokens
 * @throws {Error} When the refresh token is invalid or expired
 * @throws {Error} When the user associated with the token does not exist
 */
export async function postauthUserRefresh(props: {
  user: UserPayload;
  body: ISubscriptionRenewalGuardianUser.IRefresh;
}): Promise<ISubscriptionRenewalGuardianUser.IAuthorized> {
  const { body } = props;

  let decoded: unknown;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("userId" in (decoded as object)) ||
    typeof (decoded as any).userId !== "string"
  ) {
    throw new Error("Invalid token payload");
  }

  const userId = (decoded as { userId: string }).userId;

  const user =
    await MyGlobal.prisma.subscription_renewal_guardian_user.findUnique({
      where: { id: userId },
    });

  if (!user) {
    throw new Error("User not found");
  }

  const now = new Date();
  const accessExpiredAt = toISOStringSafe(
    new Date(now.getTime() + 60 * 60 * 1000),
  ); // 1 hour
  const refreshableUntil = toISOStringSafe(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  const newAccessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      type: "user",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const newRefreshToken = jwt.sign(
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

  return {
    id: user.id,
    email: user.email,
    password_hash: user.password_hash,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
