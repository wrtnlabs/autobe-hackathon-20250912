import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Refresh admin JWT access token.
 *
 * This endpoint accepts a valid refresh token from an admin user and returns a
 * new JWT access token along with a rotated refresh token.
 *
 * It validates the token, ensures the admin exists, and generates new tokens
 * with the same payload structure as the original login.
 *
 * @param props - Object containing the admin payload and the refresh token
 * @param props.admin - Authenticated admin payload (not directly used but
 *   required by contract)
 * @param props.body - Request body containing the refresh token
 * @returns The authorized admin user info with new JWT tokens
 * @throws {Error} When the refresh token is invalid or expired
 * @throws {Error} When the admin user does not exist
 */
export async function postauthAdminRefresh(props: {
  admin: AdminPayload;
  body: IEventRegistrationAdmin.IRefresh;
}): Promise<IEventRegistrationAdmin.IAuthorized> {
  const { body } = props;

  let decoded: unknown;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new Error("Invalid refresh token");
  }

  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token payload");
  }

  interface TokenPayload {
    id?: unknown;
    type?: unknown;
  }

  const adminIdCandidate = (decoded as TokenPayload).id;
  const adminTypeCandidate = (decoded as TokenPayload).type;

  if (typeof adminIdCandidate !== "string" || adminTypeCandidate !== "admin") {
    throw new Error("Invalid token payload: missing or incorrect id or type");
  }

  const adminId = adminIdCandidate;

  const admin = await MyGlobal.prisma.event_registration_admins.findUnique({
    where: { id: adminId },
  });

  if (!admin) {
    throw new Error("Admin user not found");
  }

  const nowMs = Date.now();
  const accessTokenExpirationSec = 60 * 60; // 1 hour
  const refreshTokenExpirationSec = 60 * 60 * 24 * 7; // 7 days

  const accessToken = jwt.sign(
    { id: admin.id, type: "admin" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: accessTokenExpirationSec,
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    { id: admin.id, type: "admin" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: refreshTokenExpirationSec,
      issuer: "autobe",
    },
  );

  return {
    id: admin.id,
    email: admin.email as string & tags.Format<"email">,
    password_hash: admin.password_hash,
    full_name: admin.full_name,
    phone_number: admin.phone_number ?? null,
    profile_picture_url: admin.profile_picture_url ?? null,
    email_verified: admin.email_verified,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: (
        nowMs +
        accessTokenExpirationSec * 1000
      ).toISOString() as unknown as string & tags.Format<"date-time">,
      refreshable_until: (
        nowMs +
        refreshTokenExpirationSec * 1000
      ).toISOString() as unknown as string & tags.Format<"date-time">,
    },
  };
}
