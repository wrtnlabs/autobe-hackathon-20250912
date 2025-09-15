import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";

/**
 * Refresh nurse authentication session (issue new JWTs) using nurse schema and
 * session token (healthcare_platform_nurses,
 * healthcare_platform_auth_sessions).
 *
 * This API operation refreshes an existing authenticated session for a nurse
 * (clinical staff user), returning new JWT and refresh tokens for continued
 * authenticated access to the healthcarePlatform system. The operation
 * references healthcare_platform_nurses (for nurse user context) and
 * healthcare_platform_auth_sessions (for refresh token lifecycle and audit),
 * verifying that the provided refresh token corresponds to an active nurse
 * account (deleted_at is null) per the Prisma schema.
 *
 * The implementation checks the validity and expiry of the refresh token using
 * only fields from the auth_sessions schema, performing error reporting for
 * invalid or mismapped tokens. If validation succeeds, it issues new tokens and
 * returns the latest nurse descriptor, reflecting updated fields as per schema
 * (created_at, updated_at, etc.). Token refresh is required for long-running or
 * session-limited workflows as per business rule, but does not alter or update
 * underlying nurse user records or audit logs directly here.
 *
 * @param props - Object containing a body with the required refresh_token
 *   (IHealthcarePlatformNurse.IRefresh)
 * @returns The authorized nurse user descriptor, including new JWT tokens and
 *   profile fields
 * @throws {Error} If the refresh token is invalid, expired, not linked to an
 *   active session, or does not map to an active nurse user
 */
export async function postauthNurseRefresh(props: {
  body: IHealthcarePlatformNurse.IRefresh;
}): Promise<IHealthcarePlatformNurse.IAuthorized> {
  const { refresh_token } = props.body;
  let decoded: unknown;
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (err) {
    throw new Error("Invalid refresh token");
  }

  // Find the session for this refresh token and 'nurse' user_type, not revoked
  const session =
    await MyGlobal.prisma.healthcare_platform_auth_sessions.findFirst({
      where: {
        refresh_token,
        user_type: "nurse",
        revoked_at: null,
      },
    });
  if (!session) throw new Error("Session not found or revoked");
  // Session expires_at must be in the future
  const now = new Date();
  if (session.expires_at.getTime() <= now.getTime())
    throw new Error("Session expired");

  // Check nurse exists and is not soft deleted (deleted_at is null)
  const nurse = await MyGlobal.prisma.healthcare_platform_nurses.findUnique({
    where: { id: session.user_id },
  });
  if (!nurse || nurse.deleted_at !== null)
    throw new Error("Nurse account not found or inactive");

  // Token lifetimes: 1 hour for access, 7 days for refresh
  const accessExp = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExp = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Generate new access and refresh tokens with correct payload structure
  const accessToken = jwt.sign(
    {
      id: nurse.id,
      type: "nurse",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const newRefreshToken = jwt.sign(
    {
      id: nurse.id,
      type: "nurse",
      kind: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Properly serialize all date fields
  return {
    id: nurse.id,
    email: nurse.email,
    full_name: nurse.full_name,
    license_number: nurse.license_number,
    specialty: nurse.specialty ?? undefined,
    phone: nurse.phone ?? undefined,
    created_at: toISOStringSafe(nurse.created_at),
    updated_at: toISOStringSafe(nurse.updated_at),
    deleted_at:
      nurse.deleted_at !== undefined && nurse.deleted_at !== null
        ? toISOStringSafe(nurse.deleted_at)
        : null,
    token: {
      access: accessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessExp),
      refreshable_until: toISOStringSafe(refreshExp),
    },
  };
}
