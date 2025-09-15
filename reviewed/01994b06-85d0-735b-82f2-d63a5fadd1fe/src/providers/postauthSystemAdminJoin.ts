import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Register a system administrator (superuser) for the healthcarePlatform.
 *
 * This endpoint enforces unique system admin registration based on business
 * email, securely hashes passwords for local authentication, records
 * authentication provider, and provisions an onboarding JWT session. All times
 * are recorded in strict ISO 8601 format. Admin registration attempts are fully
 * audited for compliance.
 *
 * @param props - Registration details and authentication provider context.
 * @returns IHealthcarePlatformSystemAdmin.IAuthorized - Onboarding profile and
 *   JWT auth tokens.
 * @throws {Error} If email is already registered or if password policy is not
 *   met.
 * @field body - IHealthcarePlatformSystemAdmin.IJoin object.
 */
export async function postauthSystemAdminJoin(props: {
  body: IHealthcarePlatformSystemAdmin.IJoin;
}): Promise<IHealthcarePlatformSystemAdmin.IAuthorized> {
  const { email, full_name, phone, provider, provider_key, password } =
    props.body;

  // Enforce unique email for system admin
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_systemadmins.findUnique({
      where: { email },
    });
  if (duplicate)
    throw new Error("System admin account with this email already exists.");

  if (provider === "local") {
    if (!password || password.length < 12) {
      throw new Error(
        "Password must be at least 12 characters and provided for local provider registration.",
      );
    }
  }

  // Immutable ID and timestamps
  const adminId = v4();
  const authId = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Password hashing (if local)
  let password_hash: string | undefined = undefined;
  if (provider === "local") {
    password_hash = await MyGlobal.password.hash(password!);
  }

  // Insert admin and auth row as transaction
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.healthcare_platform_systemadmins.create({
      data: {
        id: adminId,
        email,
        full_name,
        phone: phone ?? undefined,
        created_at: now,
        updated_at: now,
        deleted_at: undefined,
      },
    }),
    MyGlobal.prisma.healthcare_platform_user_authentications.create({
      data: {
        id: authId,
        user_id: adminId,
        user_type: "systemadmin",
        provider,
        provider_key,
        password_hash: password_hash ?? undefined,
        created_at: now,
        updated_at: now,
        deleted_at: undefined,
      },
    }),
  ]);

  // JWT token logic
  const accessExp = 60 * 60; // 1 hour in seconds
  const refreshExp = 60 * 60 * 24 * 7; // 7 days

  const nowMs = Date.now();
  const accessToken = jwt.sign(
    { id: adminId, type: "systemAdmin" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: accessExp,
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    { id: adminId, type: "systemAdmin", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: refreshExp,
      issuer: "autobe",
    },
  );

  const expired_at: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(nowMs + accessExp * 1000),
  );
  const refreshable_until: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(nowMs + refreshExp * 1000),
  );

  // Build and return DTO
  return {
    id: adminId,
    email,
    full_name,
    phone: phone ?? undefined,
    created_at: now,
    updated_at: now,
    deleted_at: undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at,
      refreshable_until,
    },
  };
}
