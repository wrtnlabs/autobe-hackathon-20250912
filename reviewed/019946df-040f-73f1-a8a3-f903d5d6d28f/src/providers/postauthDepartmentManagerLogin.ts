import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsDepartmentManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsDepartmentManager";
import { DepartmentmanagerPayload } from "../decorators/payload/DepartmentmanagerPayload";

/**
 * Authenticates an existing department manager user via email and password.
 * Verifies credentials against stored password hash and issues JWT access and
 * refresh tokens upon successful authentication. Also creates a session record
 * for the authenticated user with token expiration.
 *
 * @param props - Object containing the departmentManager payload and login body
 * @returns Authorized department manager information including tokens
 * @throws {Error} If credentials are invalid or user not found
 */
export async function postauthDepartmentManagerLogin(props: {
  departmentManager: DepartmentmanagerPayload;
  body: IEnterpriseLmsDepartmentManager.ILogin;
}): Promise<IEnterpriseLmsDepartmentManager.IAuthorized> {
  const { body } = props;

  // Find active department manager by email
  const user = await MyGlobal.prisma.enterprise_lms_departmentmanager.findFirst(
    {
      where: {
        email: body.email,
        status: "active",
        deleted_at: null,
      },
    },
  );

  if (!user) {
    throw new Error("Invalid credentials");
  }

  // Verify password using MyGlobal.password utility
  const isPasswordValid = await MyGlobal.password.verify(
    body.password,
    user.password_hash,
  );

  if (!isPasswordValid) {
    throw new Error("Invalid credentials");
  }

  // Prepare timestamps for token expiration
  const now = toISOStringSafe(new Date());
  const accessTokenExpiresInMs = 60 * 60 * 1000; // 1 hour
  const refreshTokenExpiresInMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  const accessTokenExpireDate = new Date(Date.now() + accessTokenExpiresInMs);
  const refreshTokenExpireDate = new Date(Date.now() + refreshTokenExpiresInMs);

  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      type: "departmentManager",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
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

  // Create new session record
  await MyGlobal.prisma.enterprise_lms_sessions.create({
    data: {
      id: v4(),
      enterprise_lms_tenant_id: user.tenant_id,
      user_id: user.id,
      session_token: v4(),
      created_at: now,
      updated_at: now,
      expires_at: toISOStringSafe(refreshTokenExpireDate),
    },
  });

  // Return authorized user info with tokens
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
      expired_at: toISOStringSafe(accessTokenExpireDate),
      refreshable_until: toISOStringSafe(refreshTokenExpireDate),
    },
  };
}
