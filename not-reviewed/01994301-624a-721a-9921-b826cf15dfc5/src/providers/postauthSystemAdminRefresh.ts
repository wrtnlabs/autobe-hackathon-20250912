import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";

/**
 * Refresh JWT tokens for active system administrator session
 * (ats_recruitment_systemadmins table).
 *
 * This function validates a provided refresh token (JWT) for a system admin,
 * verifies the session subject's active/non-deleted status, and issues new
 * access and refresh JWT tokens along with the full admin profile in a secure
 * structure. All expiration times are computed as ISO 8601 strings. If the
 * refresh token is invalid, expired, or the admin's account is disabled or
 * soft-deleted, the operation throws an explicit error.
 *
 * Audit log of the refresh attempt (success/failure) should be recorded
 * elsewhere as per system policy.
 *
 * @param props - Object containing the refresh token in body: { body: {
 *   refresh_token: string } }
 * @returns The authorized system admin DTO with a refreshed session and tokens
 * @throws {Error} If token is invalid or expired, or admin is inactive or
 *   deleted
 */
export async function postauthSystemAdminRefresh(props: {
  body: IAtsRecruitmentSystemAdmin.IRefresh;
}): Promise<IAtsRecruitmentSystemAdmin.IAuthorized> {
  const { refresh_token } = props.body;

  // 1. Verify/Decode refresh token and validate its payload
  let decoded: { id?: string; type?: string } | null = null;
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id?: string; type?: string };
  } catch (err) {
    throw new Error("Invalid or expired refresh token");
  }
  if (!decoded || decoded.type !== "systemadmin" || !decoded.id) {
    throw new Error("Invalid refresh token payload");
  }

  // 2. Lookup and validate admin account (must be active and not soft-deleted)
  const admin = await MyGlobal.prisma.ats_recruitment_systemadmins.findUnique({
    where: { id: decoded.id },
  });
  if (!admin || !admin.is_active || admin.deleted_at !== null) {
    throw new Error("Admin not found, inactive, or deleted");
  }

  // 3. Issue new JWT tokens and calculate ISO8601 expiry times using toISOStringSafe
  const now = Date.now();
  const accessExpiresAt = toISOStringSafe(new Date(now + 60 * 60 * 1000)); // 1 hour
  const refreshExpiresAt = toISOStringSafe(
    new Date(now + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days

  const payload = { id: admin.id, type: "systemadmin" };

  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    super_admin: admin.super_admin,
    is_active: admin.is_active,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      admin.deleted_at === null || admin.deleted_at === undefined
        ? undefined
        : toISOStringSafe(admin.deleted_at),
    token: {
      access,
      refresh,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  } satisfies IAtsRecruitmentSystemAdmin.IAuthorized;
}
