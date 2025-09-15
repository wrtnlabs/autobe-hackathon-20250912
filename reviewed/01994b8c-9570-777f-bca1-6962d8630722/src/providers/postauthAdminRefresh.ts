import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ISubscriptionRenewalGuardianAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Refresh JWT token for admin user
 *
 * This operation renews JWT tokens for an authenticated admin provided a valid
 * refresh token. It verifies the refresh token, fetches the admin from the
 * database, then issues new access and refresh tokens with the same payload
 * structure.
 *
 * @param props.admin - The authenticated admin making the refresh request
 * @param props.body - The refresh token payload containing the refresh token
 *   string
 * @returns The authorized admin data along with new JWT tokens
 * @throws {Error} When the refresh token is invalid, expired, or admin user is
 *   not found
 */
export async function postauthAdminRefresh(props: {
  admin: AdminPayload;
  body: ISubscriptionRenewalGuardianAdmin.IRefresh;
}): Promise<ISubscriptionRenewalGuardianAdmin.IAuthorized> {
  const { admin, body } = props;

  // Verify and decode the refresh token
  const decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as { id: string & tags.Format<"uuid">; type: string };

  if (decoded.type !== "admin") {
    throw new Error("Invalid token type for admin refresh");
  }

  const adminRecord =
    await MyGlobal.prisma.subscription_renewal_guardian_admin.findUnique({
      where: { id: decoded.id },
    });

  if (!adminRecord) {
    throw new Error("Admin user not found");
  }

  // Durations
  const accessTokenValidityMs = 3600 * 1000; // 1 hour
  const refreshTokenValidityMs = 7 * 24 * 3600 * 1000; // 7 days

  const nowTimestamp = Date.now();
  const accessTokenExpireDate = toISOStringSafe(
    new Date(nowTimestamp + accessTokenValidityMs),
  );
  const refreshTokenExpireDate = toISOStringSafe(
    new Date(nowTimestamp + refreshTokenValidityMs),
  );

  // Prepare payload matching login/join structure
  const accessTokenPayload = {
    id: adminRecord.id,
    email: adminRecord.email,
    password_hash: adminRecord.password_hash,
    created_at: adminRecord.created_at as string & tags.Format<"date-time">,
    updated_at: adminRecord.updated_at as string & tags.Format<"date-time">,
    type: "admin" as const,
  };

  const newAccessToken = jwt.sign(
    accessTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const newRefreshToken = jwt.sign(
    { id: adminRecord.id, type: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  return {
    id: adminRecord.id,
    email: adminRecord.email,
    password_hash: adminRecord.password_hash,
    created_at: adminRecord.created_at as string & tags.Format<"date-time">,
    updated_at: adminRecord.updated_at as string & tags.Format<"date-time">,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessTokenExpireDate,
      refreshable_until: refreshTokenExpireDate,
    },
  };
}
