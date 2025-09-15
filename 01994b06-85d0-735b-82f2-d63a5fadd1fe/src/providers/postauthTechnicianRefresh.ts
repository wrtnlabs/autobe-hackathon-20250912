import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Refresh authorized tokens for technician
 * (IHealthcarePlatformTechnician.IAuthorized).
 *
 * This endpoint enables technician accounts to refresh access and refresh JWT
 * tokens for continued, seamless authorized access to the healthcarePlatform.
 * It validates the provided refresh token against active session records (not
 * revoked, not expired, user_type: 'technician'). On success, it issues new JWT
 * tokens, updates session metadata, and returns the technician profile and full
 * token info for session continuation.
 *
 * All security, business, and regulatory requirements for session refresh and
 * audit logging are enforced. If the token is expired, revoked, or otherwise
 * invalid, an error is thrown and this event should be logged for compliance
 * and investigation.
 *
 * @param props - Properties for session refresh
 * @param props.body - Request body containing the technician refresh token
 *   (IHealthcarePlatformTechnician.IRefresh)
 * @returns The authorized technician profile and new tokens
 *   (IHealthcarePlatformTechnician.IAuthorized)
 * @throws {Error} If the refresh token is invalid, expired, revoked, or the
 *   technician account is not found
 */
export async function postauthTechnicianRefresh(props: {
  body: IHealthcarePlatformTechnician.IRefresh;
}): Promise<IHealthcarePlatformTechnician.IAuthorized> {
  const { refresh_token } = props.body;

  // Step 1: Validate and find the active, unexpired session for a technician.
  const session =
    await MyGlobal.prisma.healthcare_platform_auth_sessions.findFirst({
      where: {
        refresh_token: refresh_token,
        user_type: "technician",
        revoked_at: null,
        expires_at: { gt: toISOStringSafe(new Date()) },
      },
    });
  if (!session) {
    throw new Error("Invalid, expired, or revoked refresh token");
  }

  // Step 2: Find the technician account for the session.
  const technician =
    await MyGlobal.prisma.healthcare_platform_technicians.findFirst({
      where: { id: session.user_id },
    });
  if (!technician) {
    throw new Error("Technician account for session not found");
  }

  // Compute new session times (UTC ISO strings).
  const nowString = toISOStringSafe(new Date());
  const accessExpiresInSec = 60 * 60; // 1 hour
  const refreshExpiresInSec = 7 * 24 * 60 * 60; // 7 days
  const accessExpiredAtString = toISOStringSafe(
    new Date(Date.now() + accessExpiresInSec * 1_000),
  );
  const refreshExpiredAtString = toISOStringSafe(
    new Date(Date.now() + refreshExpiresInSec * 1_000),
  );

  // Step 3: Create new JWT access and refresh tokens.
  const jwtPayload = { id: technician.id, type: "technician" };
  const accessJWT = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: accessExpiresInSec,
    issuer: "autobe",
  });
  // Add a rotation value to the refresh payload to prevent replay attacks.
  const refreshJWT = jwt.sign(
    { id: technician.id, type: "technician", rotate: v4() },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: refreshExpiresInSec,
      issuer: "autobe",
    },
  );

  // Step 4: Update the existing session record with new values (audit trail enforced by DB).
  await MyGlobal.prisma.healthcare_platform_auth_sessions.update({
    where: { id: session.id },
    data: {
      session_token: accessJWT,
      refresh_token: refreshJWT,
      issued_at: nowString,
      expires_at: refreshExpiredAtString,
      revoked_at: null,
    },
  });

  // Step 5: Build the IHealthcarePlatformTechnician.IAuthorized response (dates as string & tags.Format<'date-time'>; UUIDs as string & tags.Format<'uuid'>).
  return {
    id: technician.id,
    email: technician.email,
    full_name: technician.full_name,
    license_number: technician.license_number,
    specialty: technician.specialty ?? undefined,
    phone: technician.phone ?? undefined,
    created_at: toISOStringSafe(technician.created_at),
    updated_at: toISOStringSafe(technician.updated_at),
    deleted_at: technician.deleted_at
      ? toISOStringSafe(technician.deleted_at)
      : undefined,
    token: {
      access: accessJWT,
      refresh: refreshJWT,
      expired_at: accessExpiredAtString,
      refreshable_until: refreshExpiredAtString,
    },
  };
}
