import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEventRegistrationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEventRegistrationAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Authenticate an admin user with their email and password hash.
 *
 * @param props - Object containing the admin payload and login credentials
 * @param props.admin - The admin payload (not used directly but required by
 *   contract)
 * @param props.body - Login credentials including email and password hash
 * @returns Object representing the authorized admin including JWT tokens
 * @throws {Error} If credentials are invalid or email is not verified
 */
export async function postauthAdminLogin(props: {
  admin: AdminPayload;
  body: IEventRegistrationAdmin.ILogin;
}): Promise<IEventRegistrationAdmin.IAuthorized> {
  const { body } = props;

  // Find admin by email
  const admin = await MyGlobal.prisma.event_registration_admins.findUnique({
    where: { email: body.email },
  });

  if (!admin) {
    throw new Error("Invalid credentials");
  }

  // Check email verification status
  if (!admin.email_verified) {
    throw new Error("Email not verified");
  }

  // Verify password
  const isValid = await MyGlobal.password.verify(
    body.password_hash,
    admin.password_hash,
  );
  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  // Generate tokens with correct expiry
  const accessTokenExpiresInSec = 3600; // 1 hour
  const refreshTokenExpiresInSec = 604800; // 7 days
  const now = Math.floor(Date.now() / 1000);

  const accessToken = jwt.sign(
    {
      id: admin.id,
      type: "admin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: admin.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Calculate expiry timestamps as ISO strings
  const expired_at = toISOStringSafe(
    new Date((now + accessTokenExpiresInSec) * 1000),
  );
  const refreshable_until = toISOStringSafe(
    new Date((now + refreshTokenExpiresInSec) * 1000),
  );

  // Return authorized admin object with tokens
  return {
    id: admin.id,
    email: admin.email as string & tags.Format<"email">,
    password_hash: admin.password_hash,
    full_name: admin.full_name,
    phone_number: admin.phone_number ?? undefined,
    profile_picture_url: admin.profile_picture_url ?? undefined,
    email_verified: admin.email_verified,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expired_at,
      refreshable_until: refreshable_until,
    },
  };
}
