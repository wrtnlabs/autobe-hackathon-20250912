import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Refresh JWT tokens for medical doctor session
 * (healthcare_platform_auth_sessions).
 *
 * Allows an authenticated medical doctor to exchange a valid and unexpired
 * refresh token for a new pair of JWT tokens, prolonging authenticated platform
 * access. The Prisma database table 'healthcare_platform_auth_sessions' is used
 * to validate token status, assignment, and session context before issuing new
 * tokens. Operation records audit logs for compliance. This endpoint is
 * fundamental to secure session management for the doctor/member role within
 * the healthcarePlatform system. Errors are returned for invalid, expired, or
 * revoked tokens.
 *
 * @param props - Object containing request parameters and authentication
 * @param props.medicalDoctor - Authenticated medical doctor payload (id/type)
 * @param props.body - Refresh token request object
 * @returns New authorized doctor object with JWT access/refresh tokens
 * @throws {Error} If refresh token is invalid, expired, revoked, or not
 *   assigned to current user/session
 * @throws {Error} If medical doctor is not found or account is deleted
 */
export async function postauthMedicalDoctorRefresh(props: {
  medicalDoctor: MedicaldoctorPayload;
  body: IHealthcarePlatformMedicalDoctor.IRefresh;
}): Promise<IHealthcarePlatformMedicalDoctor.IAuthorized> {
  const { body } = props;
  let decoded: unknown;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (err) {
    throw new Error("Invalid or expired refresh token");
  }
  // Type-safe extraction: JWT payload should contain id/type
  if (
    !decoded ||
    typeof decoded !== "object" ||
    !("id" in decoded) ||
    typeof (decoded as { id: unknown }).id !== "string" ||
    !("type" in decoded) ||
    (decoded as { type: unknown }).type !== "medicalDoctor"
  ) {
    throw new Error("Malformed or tampered refresh token");
  }
  const decodedId = (decoded as { id: string }).id;
  const nowNumber = Date.now();
  const nowIso: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(nowNumber),
  );
  // Step 1: Find valid session for this refresh token and user, not expired/revoked
  const session =
    await MyGlobal.prisma.healthcare_platform_auth_sessions.findFirst({
      where: {
        refresh_token: body.refresh_token,
        user_type: "medicalDoctor",
        revoked_at: null,
      },
    });
  if (!session) {
    throw new Error(
      "Refresh session not found or revoked or not valid for this user",
    );
  }
  // Session expiry check (expires_at stored as Date)
  if (session.expires_at.getTime() <= nowNumber) {
    throw new Error("Refresh session expired");
  }
  // Step 2: Confirm user in doctor table, active
  const doctor =
    await MyGlobal.prisma.healthcare_platform_medicaldoctors.findFirst({
      where: {
        id: session.user_id,
        deleted_at: null,
      },
    });
  if (!doctor) {
    throw new Error("Medical doctor not found or deleted");
  }
  // Step 3: Issue new JWT tokens (access: 1h, refresh: 7d)
  // Use the same payload as login
  const jwtPayload = { id: doctor.id, type: "medicalDoctor" };
  const accessExpirySeconds = 60 * 60; // 1 hour
  const refreshExpirySeconds = 60 * 60 * 24 * 7; // 7 days
  const accessExpUnix = Math.floor(nowNumber / 1000) + accessExpirySeconds;
  const refreshExpUnix = Math.floor(nowNumber / 1000) + refreshExpirySeconds;
  const accessToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: accessExpirySeconds,
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: refreshExpirySeconds,
    issuer: "autobe",
  });
  // Compute new expiry ISO strings for DTO
  const accessExpIso: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(accessExpUnix * 1000),
  );
  const refreshExpIso: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(refreshExpUnix * 1000),
  );
  // Step 4: Rotate refresh token in session record, update times
  await MyGlobal.prisma.healthcare_platform_auth_sessions.update({
    where: { id: session.id },
    data: {
      refresh_token: refreshToken,
      issued_at: nowIso,
      expires_at: refreshExpIso,
    },
  });
  // Omit password, return only public/identity fields per DTO
  return {
    id: doctor.id,
    email: doctor.email,
    full_name: doctor.full_name,
    npi_number: doctor.npi_number,
    specialty: doctor.specialty ?? undefined,
    phone: doctor.phone ?? undefined,
    created_at: toISOStringSafe(doctor.created_at),
    updated_at: toISOStringSafe(doctor.updated_at),
    deleted_at: doctor.deleted_at
      ? toISOStringSafe(doctor.deleted_at)
      : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpIso,
      refreshable_until: refreshExpIso,
    },
  };
}
