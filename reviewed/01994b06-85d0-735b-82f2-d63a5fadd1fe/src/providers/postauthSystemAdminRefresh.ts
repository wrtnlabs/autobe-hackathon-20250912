import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Refresh system administrator session/token
 * (healthcare_platform_auth_sessions)
 *
 * This endpoint allows a currently authenticated system administrator to
 * refresh their JWT access and refresh tokens using a valid refresh token. The
 * backend locates the corresponding healthcare_platform_auth_sessions record,
 * verifies session and token validity, and issues new tokens only if the
 * session is still active and not revoked. All actions are logged to the audit
 * table for security and compliance. No password hashes or session secrets are
 * ever exposed.
 *
 * @param props.body - Object containing a single property: refresh_token
 * @returns The admin's authorized profile and a new pair of JWT tokens for
 *   continued session use
 * @throws {Error} If token is invalid, expired, revoked, or session not found.
 *   Also logs audit and revokes session if needed.
 */
export async function postauthSystemAdminRefresh(props: {
  body: IHealthcarePlatformSystemAdmin.IRefresh;
}): Promise<IHealthcarePlatformSystemAdmin.IAuthorized> {
  const { refresh_token } = props.body;
  let decoded: { session_token: string; user_id: string; user_type: string };
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { session_token: string; user_id: string; user_type: string };
  } catch (error) {
    await MyGlobal.prisma.healthcare_platform_audit_logs.create({
      data: {
        action_type: "TOKEN_REFRESH_FAIL",
        event_context: JSON.stringify({ error: "JWT decode fail" }),
        created_at: toISOStringSafe(new Date()),
      },
    });
    throw new Error("Invalid refresh token");
  }

  const { session_token, user_id, user_type } = decoded || {};
  if (
    typeof session_token !== "string" ||
    typeof user_id !== "string" ||
    user_type !== "systemAdmin"
  ) {
    await MyGlobal.prisma.healthcare_platform_audit_logs.create({
      data: {
        action_type: "TOKEN_REFRESH_INVALID_CLAIMS",
        event_context: JSON.stringify(decoded),
        created_at: toISOStringSafe(new Date()),
      },
    });
    throw new Error("Invalid token claims");
  }

  // Check session
  const session =
    await MyGlobal.prisma.healthcare_platform_auth_sessions.findFirst({
      where: {
        session_token,
        refresh_token,
        user_id,
        user_type: "systemAdmin",
        revoked_at: null,
      },
    });

  const nowIso = toISOStringSafe(new Date());
  if (
    !session ||
    (session.expires_at instanceof Date
      ? toISOStringSafe(session.expires_at) <= nowIso
      : session.expires_at <= nowIso)
  ) {
    // Soft revoke if session found
    if (session) {
      await MyGlobal.prisma.healthcare_platform_auth_sessions.update({
        where: { id: session.id },
        data: {
          revoked_at: nowIso,
        },
      });
    }
    await MyGlobal.prisma.healthcare_platform_audit_logs.create({
      data: {
        action_type: "TOKEN_REFRESH_FAIL_EXPIRED",
        event_context: JSON.stringify({ session_token, user_id }),
        created_at: nowIso,
      },
    });
    throw new Error("Session expired or revoked");
  }

  const admin =
    await MyGlobal.prisma.healthcare_platform_systemadmins.findUnique({
      where: { id: user_id },
    });
  if (!admin) {
    await MyGlobal.prisma.healthcare_platform_audit_logs.create({
      data: {
        action_type: "TOKEN_REFRESH_FAIL_ADMIN_NOT_FOUND",
        event_context: JSON.stringify({ user_id }),
        created_at: nowIso,
      },
    });
    throw new Error("System admin not found");
  }
  // Generate new expiry times as ISO strings
  const accessExp = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExp = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const new_access_token = jwt.sign(
    { id: admin.id, type: "systemAdmin" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const new_refresh_token = jwt.sign(
    { session_token, user_id: admin.id, user_type: "systemAdmin" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Update session and log event before return
  await MyGlobal.prisma.healthcare_platform_auth_sessions.update({
    where: { id: session.id },
    data: {
      refresh_token: new_refresh_token,
      expires_at: refreshExp,
      // Optionally update issued_at
    },
  });
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      action_type: "TOKEN_REFRESH_SUCCESS",
      event_context: JSON.stringify({ id: admin.id }),
      created_at: nowIso,
    },
  });

  return {
    id: admin.id,
    email: admin.email,
    full_name: admin.full_name,
    phone: typeof admin.phone === "string" ? admin.phone : undefined,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at
      ? toISOStringSafe(admin.deleted_at)
      : undefined,
    token: {
      access: new_access_token,
      refresh: new_refresh_token,
      expired_at: accessExp,
      refreshable_until: refreshExp,
    },
  };
}
