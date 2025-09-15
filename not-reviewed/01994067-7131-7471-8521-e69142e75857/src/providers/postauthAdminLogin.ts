import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Admin user login authenticates credentials stored in the oauth_server_admins
 * table including email and hashed password fields. Successful login returns
 * JWT tokens that provide access rights for admin operations. Security involves
 * safe handling of password verification and token generation.
 *
 * @param props - Object containing admin payload and login credentials
 * @param props.admin - Admin user payload (not used for auth as this is login)
 * @param props.body - Login credentials including email and password
 * @returns Authorized admin user authentication response with JWT tokens
 * @throws {Error} When the credentials are invalid
 */
export async function postauthAdminLogin(props: {
  admin: AdminPayload;
  body: IOauthServerAdmin.ILogin;
}): Promise<IOauthServerAdmin.IAuthorized> {
  const { admin, body } = props;

  // Find admin by email and check not soft-deleted
  const found = await MyGlobal.prisma.oauth_server_admins.findFirst({
    where: { email: body.email, deleted_at: null },
  });

  if (!found) {
    throw new Error("Invalid credentials");
  }

  // Verify password
  const verified = await MyGlobal.password.verify(
    body.password,
    found.password_hash,
  );

  if (!verified) {
    throw new Error("Invalid credentials");
  }

  // Generate JWT tokens
  const accessToken = jwt.sign(
    { id: found.id, email: found.email, type: "admin" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    { id: found.id, token_type: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Calculate expiration timestamps
  const expiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  return {
    id: found.id,
    email: found.email,
    email_verified: found.email_verified,
    password_hash: found.password_hash,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at: found.deleted_at ? toISOStringSafe(found.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
