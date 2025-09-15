import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Refresh JWT tokens for organization administrator user.
 *
 * This operation verifies the provided refresh token to authenticate and issue
 * new access and refresh tokens for the organization administrator user. It
 * fetches the user from the database, confirms the user status is active, and
 * returns user information along with new tokens.
 *
 * @param props - Object containing refresh token payload
 * @param props.body - Body containing the refresh_token string
 * @returns Refreshed authorized organizationAdmin user with new JWT tokens
 * @throws {Error} When the refresh token is invalid or expired
 * @throws {Error} When the organization administrator user is not found
 * @throws {Error} When the organization administrator user is not active
 */
export async function patchauthOrganizationAdminRefresh(props: {
  body: IEnterpriseLmsOrganizationAdmin.IRefresh;
}): Promise<IEnterpriseLmsOrganizationAdmin.IAuthorized> {
  const { refresh_token } = props.body;

  // Verify the refresh token and decode
  const decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as { id: string } | null;
  if (!decoded || typeof decoded !== "object" || !decoded.id) {
    throw new Error("Invalid refresh token.");
  }

  // Fetch user
  const user =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUnique({
      where: { id: decoded.id },
    });
  if (!user) throw new Error("Organization administrator user not found.");
  if (user.status !== "active")
    throw new Error("Organization administrator user is not active.");

  // Generate new tokens
  const now = toISOStringSafe(new Date());
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      status: user.status,
      tenant_id: user.tenant_id,
      type: "organizationadmin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    { id: user.id, type: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

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
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(Date.now() + 3600000)),
      refreshable_until: toISOStringSafe(new Date(Date.now() + 604800000)),
    },
  };
}
