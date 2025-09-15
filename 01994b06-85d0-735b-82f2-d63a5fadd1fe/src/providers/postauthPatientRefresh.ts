import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * Refresh and renew authentication tokens for an active patient session.
 *
 * This endpoint validates a patient's refresh token via
 * healthcare_platform_auth_sessions, rotates the refresh token if successful,
 * and issues new JWT access and refresh tokens. All session and patient state
 * is checked for compliance with revocation/expiry and proper business logic
 * (multi-tenant, HIPAA-conformant). All time fields are formatted as branded
 * ISO-8601 strings. If any condition fails, explicit errors are thrown.
 *
 * @param props - Object containing the refresh_token in body per
 *   IHealthcarePlatformPatient.IRefresh
 * @returns Patient's authorized session info and tokens as
 *   IHealthcarePlatformPatient.IAuthorized
 * @throws {Error} When refresh token is invalid, session is revoked/expired, or
 *   patient not found.
 */
export async function postauthPatientRefresh(props: {
  body: IHealthcarePlatformPatient.IRefresh;
}): Promise<IHealthcarePlatformPatient.IAuthorized> {
  const { refresh_token } = props.body;
  let payload: { id: string; type: string };
  try {
    payload = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (_) {
    throw new Error("Invalid or expired refresh token.");
  }
  // Find active session: refresh_token is exact match, user_type is 'patient', not revoked, not expired.
  const nowIso = toISOStringSafe(new Date());
  const nowRawMs = Date.now();
  const session =
    await MyGlobal.prisma.healthcare_platform_auth_sessions.findFirst({
      where: {
        refresh_token,
        user_type: "patient",
        revoked_at: null,
        expires_at: { gt: new Date(nowIso) },
      },
    });
  if (!session) {
    throw new Error(
      "Session revoked, expired, or not found for refresh token.",
    );
  }
  const patient = await MyGlobal.prisma.healthcare_platform_patients.findUnique(
    {
      where: { id: session.user_id },
    },
  );
  if (!patient) {
    throw new Error("Patient not found for session.");
  }
  // Issue new tokens and calculate expiry
  const accessExpMs = nowRawMs + 60 * 60 * 1000; // 1h
  const refreshExpMs = nowRawMs + 7 * 24 * 60 * 60 * 1000; // 7d
  const accessExpiredAt = toISOStringSafe(new Date(accessExpMs));
  const refreshExpiredAt = toISOStringSafe(new Date(refreshExpMs));
  const accessToken = jwt.sign(
    { id: patient.id, type: "patient" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const nextRefreshToken = jwt.sign(
    { id: patient.id, type: "patient" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Rotate refresh token and session expiry
  await MyGlobal.prisma.healthcare_platform_auth_sessions.update({
    where: { id: session.id },
    data: {
      refresh_token: nextRefreshToken,
      issued_at: nowIso,
      expires_at: new Date(refreshExpiredAt),
      revoked_at: null,
    },
  });
  return {
    id: patient.id,
    email: patient.email,
    full_name: patient.full_name,
    date_of_birth: toISOStringSafe(patient.date_of_birth),
    phone: patient.phone ?? undefined,
    created_at: toISOStringSafe(patient.created_at),
    updated_at: toISOStringSafe(patient.updated_at),
    deleted_at: patient.deleted_at
      ? toISOStringSafe(patient.deleted_at)
      : undefined,
    token: {
      access: accessToken,
      refresh: nextRefreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
    refresh_token: nextRefreshToken,
  };
}
