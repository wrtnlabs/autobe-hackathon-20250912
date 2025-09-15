import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ISubscriptionRenewalGuardianAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Authenticate an admin user by validating email and password.
 *
 * This operation verifies the administrator's login credentials against the
 * subscription_renewal_guardian_admin table. If successful, it issues JWT
 * access and refresh tokens with appropriate claims.
 *
 * The operation performs secure password verification using MyGlobal.password.
 * It does not require prior authentication and is publicly accessible.
 *
 * @param props - Object containing admin payload (not used here) and login body
 *   with email and password.
 * @param props.admin - The admin payload making the request (not used for
 *   login).
 * @param props.body - The login information including email and password_hash.
 * @returns Authorized admin user details with JWT tokens.
 * @throws {Error} Throws an error if authentication fails (invalid
 *   credentials).
 */
export async function postauthAdminLogin(props: {
  admin: AdminPayload;
  body: ISubscriptionRenewalGuardianAdmin.ILogin;
}): Promise<ISubscriptionRenewalGuardianAdmin.IAuthorized> {
  const { body } = props;

  const admin =
    await MyGlobal.prisma.subscription_renewal_guardian_admin.findUnique({
      where: { email: body.email },
    });

  if (!admin) {
    throw new Error("Unauthorized");
  }

  const valid = await MyGlobal.password.verify(
    body.password_hash,
    admin.password_hash,
  );
  if (!valid) {
    throw new Error("Unauthorized");
  }

  const nowIso = toISOStringSafe(new Date());

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

  return {
    id: admin.id,
    email: admin.email,
    password_hash: admin.password_hash,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(Date.now() + 3600 * 1000)),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 7 * 24 * 3600 * 1000),
      ),
    },
  };
}
