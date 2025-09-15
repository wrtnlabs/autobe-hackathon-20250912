import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";

/**
 * Authenticate system admin and issue JWT tokens
 * (ats_recruitment_systemadmins).
 *
 * This endpoint validates a system administrator's credentials and issues JWT
 * access/refresh tokens. Credentials are checked against the
 * ats_recruitment_systemadmins table (email, password_hash). Account activation
 * (is_active=true) and non-deletion (deleted_at=null) are enforced. Successful
 * and failed login attempts are audit-logged.
 *
 * @param props - { body: { email, password } } The admin's login details
 * @returns Authorized admin DTO, including JWT tokens and all schema fields
 *   required for session/auth
 * @throws {Error} If credentials are invalid or the account is inactive
 */
export async function postauthSystemAdminLogin(props: {
  body: IAtsRecruitmentSystemAdmin.ILogin;
}): Promise<IAtsRecruitmentSystemAdmin.IAuthorized> {
  const { email, password } = props.body;

  // Find admin by email, ignoring deleted admins
  const admin = await MyGlobal.prisma.ats_recruitment_systemadmins.findFirst({
    where: {
      email,
      deleted_at: null,
    },
  });

  // Establish the current time as a string for audit logs
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Log failed login for not found/inactive user, and throw to avoid revealing which failed
  if (!admin || !admin.is_active) {
    await MyGlobal.prisma.ats_recruitment_authentication_failures.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        attempted_at: now,
        attempted_user_identifier: email,
        ip_address: undefined,
        device_info: undefined,
        failure_reason: !admin
          ? "user_not_found"
          : !admin.is_active
            ? "account_inactive"
            : "unknown_failure",
        lockout_triggered: false,
      },
    });
    throw new Error("Invalid credentials or inactive account");
  }

  const passwordValid = await MyGlobal.password.verify(
    password,
    admin.password_hash,
  );
  if (!passwordValid) {
    await MyGlobal.prisma.ats_recruitment_authentication_failures.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        attempted_at: now,
        attempted_user_identifier: email,
        ip_address: undefined,
        device_info: undefined,
        failure_reason: "wrong_password",
        lockout_triggered: false,
      },
    });
    throw new Error("Invalid credentials or inactive account");
  }

  // Log successful login (for audit) in the login history table
  await MyGlobal.prisma.ats_recruitment_actor_login_histories.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_id: admin.id,
      actor_type: "system_admin",
      login_succeeded: true,
      origin_ip: undefined,
      user_agent: undefined,
      login_at: now,
    },
  });

  // Calculate expiry timestamps for JWTs
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Issue tokens
  const accessToken = jwt.sign(
    { id: admin.id, type: "systemadmin" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    { id: admin.id, type: "systemadmin", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Build response strictly per DTO rules
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    super_admin: admin.super_admin,
    is_active: admin.is_active,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at
      ? toISOStringSafe(admin.deleted_at)
      : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
