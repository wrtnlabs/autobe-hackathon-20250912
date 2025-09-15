import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * Authenticate an organizationAdmin user and issue JWT tokens.
 *
 * This endpoint verifies the credentials of an organization administrator user
 * in the Enterprise LMS system. It checks for account existence, verifies
 * password hash using MyGlobal.password, and ensures the account status is
 * "active". On successful validation, it generates and returns JWT access and
 * refresh tokens with appropriate expiry.
 *
 * @param props - Object containing the login credentials.
 * @param props.body - Login data including email and plaintext password.
 * @returns An authorized organization administrator user object with JWT
 *   tokens.
 * @throws {Error} When user not found or password is invalid.
 * @throws {Error} When the account status is not active.
 */
export async function postauthOrganizationAdminLogin(props: {
  body: IEnterpriseLmsOrganizationAdmin.ILogin;
}): Promise<IEnterpriseLmsOrganizationAdmin.IAuthorized> {
  const { email, password } = props.body;

  // Find organization admin by email
  const user = await MyGlobal.prisma.enterprise_lms_organizationadmin.findFirst(
    { where: { email } },
  );

  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Check if user status is active
  if (user.status !== "active") {
    throw new Error("Account is not active");
  }

  // Verify password
  const isValidPassword = await MyGlobal.password.verify(
    password,
    user.password_hash,
  );

  if (!isValidPassword) {
    throw new Error("Invalid email or password");
  }

  // Issue JWT tokens
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      tenant_id: user.tenant_id,
      type: "organizationadmin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    { id: user.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  const now = Date.now();

  // Return authorized response
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
      expired_at: toISOStringSafe(new Date(now + 3600 * 1000)),
      refreshable_until: toISOStringSafe(new Date(now + 7 * 24 * 3600 * 1000)),
    },
  };
}
