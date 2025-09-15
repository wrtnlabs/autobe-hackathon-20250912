import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Refresh JWT tokens for authenticated systemAdmin users to maintain secure
 * sessions without re-login.
 *
 * This operation validates the provided refresh token against existing active
 * sessions and systemadmin users. It issues new JWT access and refresh tokens
 * if valid. The returned token payloads match the original authentication
 * payload structure.
 *
 * @param props - Object containing the request body and systemAdmin payload
 * @param props.systemAdmin - The authenticated systemAdmin payload (not used
 *   for refresh verification, but required)
 * @param props.body - Contains the refresh token string for renewal
 * @returns The newly authorized systemAdmin user object with fresh tokens
 * @throws {Error} When the refresh token is invalid or expired
 * @throws {Error} When the user is not found or is inactive
 */
export async function postauthSystemAdminRefresh(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsSystemAdmin.IRefresh;
}): Promise<IEnterpriseLmsSystemAdmin.IAuthorized> {
  const { body } = props;

  const now = toISOStringSafe(new Date());
  const refreshToken = body.refresh_token;

  const session = await MyGlobal.prisma.enterprise_lms_sessions.findFirst({
    where: { session_token: refreshToken },
  });

  if (!session) throw new Error("Invalid or expired refresh token");

  if (session.expires_at <= now) throw new Error("Refresh token expired");

  const user = await MyGlobal.prisma.enterprise_lms_systemadmin.findFirst({
    where: {
      id: session.user_id,
      status: "active",
      deleted_at: null,
    },
  });

  if (!user) throw new Error("User not found or inactive");

  const payload = {
    id: user.id,
    tenant_id: user.tenant_id,
    email: user.email,
    password_hash: user.password_hash,
    first_name: user.first_name,
    last_name: user.last_name,
    status: user.status,
  };

  const newAccessToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const newRefreshToken = jwt.sign(
    {
      id: user.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const token = {
    access: newAccessToken,
    refresh: newRefreshToken,
    expired_at: toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)),
    refreshable_until: refreshExpiresAt,
  };

  return {
    id: user.id,
    tenant_id: user.tenant_id,
    email: user.email,
    password_hash: user.password_hash,
    first_name: user.first_name,
    last_name: user.last_name,
    status: user.status,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null ? null : toISOStringSafe(user.deleted_at),
    token,
  };
}
