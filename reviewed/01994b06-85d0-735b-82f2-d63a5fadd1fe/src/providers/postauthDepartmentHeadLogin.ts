import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";

/**
 * Authenticate a department head (healthcare_platform_departmentheads) and
 * issue session JWT tokens.
 *
 * This operation verifies provided credentials (email/password for local login,
 * or SSO credentials) against their corresponding authentication records in
 * healthcare_platform_user_authentications. On successful authentication,
 * access and refresh JWT tokens are issued according to compliance policy.
 * Login attempts (including failures) are typically logged separately for audit
 * and incident response.
 *
 * @param props - Parameters for login
 * @param props.body - Login credentials as per
 *   IHealthcarePlatformDepartmentHead.ILoginRequest
 * @returns IHealthcarePlatformDepartmentHead.IAuthorized with issued tokens and
 *   department head profile
 * @throws {Error} When credentials are invalid, missing, or user/account is
 *   soft-deleted
 */
export async function postauthDepartmentHeadLogin(props: {
  body: IHealthcarePlatformDepartmentHead.ILoginRequest;
}): Promise<IHealthcarePlatformDepartmentHead.IAuthorized> {
  const { body } = props;

  // Step 1: Lookup the department head by email (must not be soft-deleted)
  const user =
    await MyGlobal.prisma.healthcare_platform_departmentheads.findFirst({
      where: {
        email: body.email,
        deleted_at: null,
      },
    });
  if (!user) {
    throw new Error("Invalid credentials");
  }

  // Step 2: Look up authentication record and validate credentials
  let userAuth: { password_hash?: string | null } | null = null;
  if (body.password && (!body.sso_provider || !body.sso_provider_key)) {
    // Local password login
    userAuth =
      await MyGlobal.prisma.healthcare_platform_user_authentications.findFirst({
        where: {
          user_id: user.id,
          user_type: "departmentHead",
          provider: "local",
          deleted_at: null,
        },
      });
    if (!userAuth || !userAuth.password_hash) {
      throw new Error("Invalid credentials");
    }
    const isPasswordOk = await MyGlobal.password.verify(
      body.password,
      userAuth.password_hash,
    );
    if (!isPasswordOk) {
      throw new Error("Invalid credentials");
    }
  } else if (body.sso_provider && body.sso_provider_key) {
    // SSO login (doesn't require password)
    userAuth =
      await MyGlobal.prisma.healthcare_platform_user_authentications.findFirst({
        where: {
          user_id: user.id,
          user_type: "departmentHead",
          provider: body.sso_provider,
          provider_key: body.sso_provider_key,
          deleted_at: null,
        },
      });
    if (!userAuth) {
      throw new Error("Invalid SSO credentials");
    }
  } else {
    throw new Error(
      "Insufficient login credentials (password or SSO required)",
    );
  }

  // Step 3: Build and issue tokens
  const nowMillis = Date.now();
  const accessExpMillis = nowMillis + 3600 * 1000; // 1 hour
  const refreshExpMillis = nowMillis + 7 * 24 * 3600 * 1000; // 7 days
  const accessToken = jwt.sign(
    { id: user.id, type: "departmentHead" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    { id: user.id, type: "departmentHead", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Step 4: Format all datetimes correctly using toISOStringSafe
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    phone: user.phone === null ? undefined : user.phone,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null ? undefined : toISOStringSafe(user.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(accessExpMillis)),
      refreshable_until: toISOStringSafe(new Date(refreshExpMillis)),
    },
    role: "departmentHead",
  };
}
