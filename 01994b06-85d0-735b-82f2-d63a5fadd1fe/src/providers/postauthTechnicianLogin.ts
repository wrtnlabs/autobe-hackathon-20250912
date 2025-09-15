import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Authenticate and issue tokens for a technician
 * (healthcare_platform_technicians table).
 *
 * This operation authenticates a medical technician, validating credentials,
 * issuing new access and refresh JWT tokens, records the session, and updates
 * last login. Only enabled technician users (not soft-deleted) can
 * authenticate. Tracks all business rules strictly for compliance and audit.
 *
 * @param props - Request object containing login credentials for technician
 * @param props.body - Contains `email` and `password` as required for
 *   authentication
 * @returns Technician profile information and authorization tokens upon
 *   successful login
 * @throws {Error} When credentials are invalid, not found, or the account is
 *   disabled
 */
export async function postauthTechnicianLogin(props: {
  body: IHealthcarePlatformTechnician.ILogin;
}): Promise<IHealthcarePlatformTechnician.IAuthorized> {
  const { email, password } = props.body;

  // 1. Find technician by email (must not be soft deleted)
  const technician =
    await MyGlobal.prisma.healthcare_platform_technicians.findFirst({
      where: {
        email,
        deleted_at: null,
      },
    });
  if (!technician) {
    throw new Error("Invalid credentials");
  }

  // 2. Find matching local authentication record for technician
  const auth =
    await MyGlobal.prisma.healthcare_platform_user_authentications.findFirst({
      where: {
        user_id: technician.id,
        user_type: "technician",
        provider: "local",
        provider_key: email,
        deleted_at: null,
      },
    });
  if (!auth || !auth.password_hash) {
    throw new Error("Invalid credentials");
  }

  // 3. Verify password
  const isValid = await MyGlobal.password.verify(password, auth.password_hash);
  if (!isValid) {
    throw new Error("Invalid credentials");
  }

  // 4. Record login: update last_authenticated_at
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.healthcare_platform_user_authentications.update({
    where: { id: auth.id },
    data: { last_authenticated_at: now },
  });

  // 5. Create new technician login session (for auditing/compliance)
  const sessionId = v4();
  const sessionToken = v4();
  const refreshToken = v4();
  const accessExpire = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour
  const refreshExpire = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days
  await MyGlobal.prisma.healthcare_platform_auth_sessions.create({
    data: {
      id: sessionId,
      user_id: technician.id,
      user_type: "technician",
      session_token: sessionToken,
      refresh_token: refreshToken,
      issued_at: now,
      expires_at: accessExpire,
      revoked_at: null,
      user_agent: undefined,
      ip_address: undefined,
    },
  });

  // 6. JWT tokens (strict format, issuer)
  const payload = { id: technician.id, type: "technician" };
  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(
    { ...payload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // 7. Compose authorized payload
  return {
    id: technician.id,
    email: technician.email,
    full_name: technician.full_name,
    license_number: technician.license_number,
    specialty:
      technician.specialty === undefined || technician.specialty === null
        ? undefined
        : technician.specialty,
    phone:
      technician.phone === undefined || technician.phone === null
        ? undefined
        : technician.phone,
    created_at: toISOStringSafe(technician.created_at),
    updated_at: toISOStringSafe(technician.updated_at),
    deleted_at:
      technician.deleted_at === undefined || technician.deleted_at === null
        ? undefined
        : toISOStringSafe(technician.deleted_at),
    token: {
      access,
      refresh,
      expired_at: accessExpire,
      refreshable_until: refreshExpire,
    },
  };
}
