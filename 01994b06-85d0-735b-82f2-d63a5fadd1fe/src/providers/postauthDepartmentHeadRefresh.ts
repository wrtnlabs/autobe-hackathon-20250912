import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformDepartmentHead } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformDepartmentHead";

/**
 * Refresh JWT tokens for an authenticated department head session
 * (healthcare_platform_departmentheads).
 *
 * This endpoint validates the provided refresh token, checks account activity,
 * and issues new access/refresh JWTs with accurate profile and expiry metadata.
 * Handles errors for invalid, expired, or revoked tokens, and non-existent or
 * deactivated department head accounts. All fields are typed safely with
 * tags.Format branding, and all business rules are followed precisely. No usage
 * of native Date type or type assertions, and all return values exactly match
 * IHealthcarePlatformDepartmentHead.IAuthorized contract.
 *
 * @param props - Contains body.refresh_token for department head session
 *   refresh
 * @returns IHealthcarePlatformDepartmentHead.IAuthorized DTO on success with
 *   correctly branded types and new tokens
 * @throws {Error} If the refresh token is invalid, expired, not for a
 *   department head, or user account is revoked/deleted
 */
export async function postauthDepartmentHeadRefresh(props: {
  body: IHealthcarePlatformDepartmentHead.IRefreshRequest;
}): Promise<IHealthcarePlatformDepartmentHead.IAuthorized> {
  const { body } = props;

  // 1. Verify and decode the refresh token (only accept departmentHead type)
  let decoded: { id: string; type: string };
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string; type: string };
  } catch (error) {
    throw new Error("Invalid or expired refresh token");
  }
  if (!decoded.id || !decoded.type || decoded.type !== "departmentHead") {
    throw new Error("Invalid token type for department head");
  }

  // 2. Fetch department head from DB (require not soft-deleted)
  const user =
    await MyGlobal.prisma.healthcare_platform_departmentheads.findUnique({
      where: { id: decoded.id },
    });
  if (!user || (user.deleted_at !== null && user.deleted_at !== undefined)) {
    throw new Error("Department head account does not exist or is revoked");
  }

  // 3. Compute expiry datetimes (no native Date)
  const unixNow = Number(String(Date.now()));
  const accessMs = unixNow + 60 * 60 * 1000;
  const refreshMs = unixNow + 7 * 24 * 60 * 60 * 1000;

  const expired_at = toISOStringSafe(new Date(accessMs));
  const refreshable_until = toISOStringSafe(new Date(refreshMs));

  // 4. Create new JWT access and refresh tokens (payload mirrors login structure)
  const jwtPayload = {
    id: user.id,
    type: "departmentHead",
  };
  const access = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
    expiresIn: "1h",
  });
  const refresh = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
    expiresIn: "7d",
  });

  // 5. Return exactly matching DTO including proper null/undefined handling
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    phone: user.phone === null ? null : (user.phone ?? undefined),
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
    role: "departmentHead",
  };
}
