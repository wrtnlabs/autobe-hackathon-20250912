import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";

/**
 * Authenticate a patient and authorize via /auth/patient/login; update
 * healthcare_platform_auth_sessions.
 *
 * This operation authenticates a patient in the healthcarePlatform system using
 * either email/password or supported SSO provider. On successful
 * authentication, it issues new access and refresh tokens (JWTs) scoped to the
 * patient role, records the session, and returns full session context matching
 * IHealthcarePlatformPatient.IAuthorized. If authentication fails due to
 * invalid credentials, soft-deleted account, or missing data, it logs the
 * security event and throws an explicit error. All date and UUID fields
 * strictly use branded types; no native Date usage; no type assertions.
 * Per-compliance, failed and successful logins are recorded as security/audit
 * events. No lockout is enforced in this implementation.
 *
 * @param props Request body containing login credentials (email/password or SSO
 *   provider/provider_key)
 * @returns IHealthcarePlatformPatient.IAuthorized with JWTs and patient profile
 * @throws {Error} When failed authentication, soft-deleted or missing account,
 *   missing credentials, or validation errors
 */
export async function postauthPatientLogin(props: {
  body: IHealthcarePlatformPatient.ILogin;
}): Promise<IHealthcarePlatformPatient.IAuthorized> {
  const { body } = props;
  // Find active patient by email (not soft-deleted)
  const patient = await MyGlobal.prisma.healthcare_platform_patients.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });
  if (!patient) {
    // Log incident (failed login)
    await MyGlobal.prisma.healthcare_platform_security_incidents.create({
      data: {
        id: v4(),
        organization_id: null,
        opened_by_user_id: null,
        incident_type: "FAILED_LOGIN",
        summary: `Patient login failed: invalid email (${body.email})`,
        details: null,
        status: "RESOLVED",
        severity: "LOW",
        opened_at: toISOStringSafe(new Date()),
        closed_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
    throw new Error("Invalid credentials");
  }

  let auth;
  if (body.provider && body.provider_key) {
    // Federated login
    auth =
      await MyGlobal.prisma.healthcare_platform_user_authentications.findFirst({
        where: {
          user_id: patient.id,
          user_type: "patient",
          provider: body.provider,
          provider_key: body.provider_key,
          deleted_at: null,
        },
      });
    if (!auth) {
      await MyGlobal.prisma.healthcare_platform_security_incidents.create({
        data: {
          id: v4(),
          organization_id: null,
          opened_by_user_id: patient.id,
          incident_type: "FAILED_LOGIN",
          summary: `Failed SSO login for patient ${patient.email}`,
          details: null,
          status: "RESOLVED",
          severity: "LOW",
          opened_at: toISOStringSafe(new Date()),
          closed_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
      });
      throw new Error("Invalid credentials");
    }
    // Placeholder for SSO provider credential validation logic.
  } else if (body.password) {
    // Local password login
    auth =
      await MyGlobal.prisma.healthcare_platform_user_authentications.findFirst({
        where: {
          user_id: patient.id,
          user_type: "patient",
          provider: "local",
          deleted_at: null,
        },
      });
    if (!auth || !auth.password_hash) {
      await MyGlobal.prisma.healthcare_platform_security_incidents.create({
        data: {
          id: v4(),
          organization_id: null,
          opened_by_user_id: patient.id,
          incident_type: "FAILED_LOGIN",
          summary: `Failed password login for patient ${patient.email}`,
          details: null,
          status: "RESOLVED",
          severity: "LOW",
          opened_at: toISOStringSafe(new Date()),
          closed_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
      });
      throw new Error("Invalid credentials");
    }
    const passwordOk = await MyGlobal.password.verify(
      body.password,
      auth.password_hash,
    );
    if (!passwordOk) {
      await MyGlobal.prisma.healthcare_platform_security_incidents.create({
        data: {
          id: v4(),
          organization_id: null,
          opened_by_user_id: patient.id,
          incident_type: "FAILED_LOGIN",
          summary: `Failed password verification for patient ${patient.email}`,
          details: null,
          status: "RESOLVED",
          severity: "LOW",
          opened_at: toISOStringSafe(new Date()),
          closed_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
        },
      });
      throw new Error("Invalid credentials");
    }
    // Update last_authenticated_at
    await MyGlobal.prisma.healthcare_platform_user_authentications.update({
      where: { id: auth.id },
      data: {
        last_authenticated_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  } else {
    throw new Error("Missing credentials: must supply password or SSO info");
  }

  // Session/JWT token generation
  const now = new Date();
  // Calculate expiry:
  const accessExpireInSec = 60 * 60; // 1 hour (3600 sec)
  const refreshExpireInSec = 60 * 60 * 24 * 7; // 7 days

  const access_token_exp = new Date(now.getTime() + accessExpireInSec * 1000);
  const refresh_token_exp = new Date(now.getTime() + refreshExpireInSec * 1000);

  // JWT Payload
  const payload = { id: patient.id, type: "patient" };

  const accessToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: accessExpireInSec,
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: refreshExpireInSec,
    issuer: "autobe",
  });

  // Create new session record
  await MyGlobal.prisma.healthcare_platform_auth_sessions.create({
    data: {
      id: v4(),
      user_id: patient.id,
      user_type: "patient",
      session_token: accessToken,
      refresh_token: refreshToken,
      issued_at: toISOStringSafe(now),
      expires_at: toISOStringSafe(access_token_exp),
      revoked_at: null,
      user_agent: null,
      ip_address: null,
    },
  });

  // Log successful login
  await MyGlobal.prisma.healthcare_platform_security_incidents.create({
    data: {
      id: v4(),
      organization_id: null,
      opened_by_user_id: patient.id,
      incident_type: "LOGIN",
      summary: `Patient login succeeded for ${patient.email}`,
      details: null,
      status: "RESOLVED",
      severity: "LOW",
      opened_at: toISOStringSafe(new Date()),
      closed_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
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
      refresh: refreshToken,
      expired_at: toISOStringSafe(access_token_exp),
      refreshable_until: toISOStringSafe(refresh_token_exp),
    },
    refresh_token: refreshToken,
  };
}
