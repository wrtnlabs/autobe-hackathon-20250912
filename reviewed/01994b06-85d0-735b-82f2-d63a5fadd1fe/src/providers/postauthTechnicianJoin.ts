import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformTechnician } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformTechnician";

/**
 * Register (join) a new medical technician (technician) and issue authorized
 * JWT tokens
 *
 * This endpoint implements the registration (join) process for the technician
 * role for the healthcarePlatform system. It creates a new medical technician
 * account within the system, handling storage of technical account details such
 * as email, full legal name, license_number, optional specialty and phone, and
 * initializes requisite organizational links for diagnostic and technical
 * workflows. On successful creation, a secure JWT access token and session are
 * issued, allowing the new technician to login and access role-specific
 * application areas immediately.
 *
 * Enforces unique constraints on email and license_number, securely hashes
 * passwords, and records compliance audit entries in authentication/session
 * tables. Returns the authorized session and technician resource as per
 * IHealthcarePlatformTechnician.IAuthorized.
 *
 * @param props - The props object containing the registration request body.
 * @param props.body - IHealthcarePlatformTechnician.IJoin request info (email,
 *   full_name, license_number, optional specialty and phone).
 * @returns IHealthcarePlatformTechnician.IAuthorized with tokens and user
 *   profile.
 * @throws {Error} If email or license_number is already registered, or required
 *   info is missing.
 */
export async function postauthTechnicianJoin(props: {
  body: IHealthcarePlatformTechnician.IJoin;
}): Promise<IHealthcarePlatformTechnician.IAuthorized> {
  const { body } = props;

  // Check unique email
  const existingEmail =
    await MyGlobal.prisma.healthcare_platform_technicians.findFirst({
      where: { email: body.email },
    });
  if (existingEmail) throw new Error("Email is already registered");

  // Check unique license number
  const existingLicense =
    await MyGlobal.prisma.healthcare_platform_technicians.findFirst({
      where: { license_number: body.license_number },
    });
  if (existingLicense) throw new Error("License number is already registered");

  // Password is required for authentication, but not in the DTO
  // For compliance, throw until password is part of the join body
  // If password must be present, but is not provided—throw
  if (
    !("password" in body) ||
    typeof (body as any).password !== "string" ||
    !(body as any).password.trim()
  ) {
    throw new Error("Password is required for technician registration");
  }
  const passwordHash = await MyGlobal.password.hash((body as any).password);

  // Generate IDs and timestamps
  const technicianId = v4();
  const now = toISOStringSafe(new Date());

  // Create technician record
  const technician =
    await MyGlobal.prisma.healthcare_platform_technicians.create({
      data: {
        id: technicianId,
        email: body.email,
        full_name: body.full_name,
        license_number: body.license_number,
        specialty: Object.prototype.hasOwnProperty.call(body, "specialty")
          ? (body.specialty ?? null)
          : null,
        phone: Object.prototype.hasOwnProperty.call(body, "phone")
          ? (body.phone ?? null)
          : null,
        created_at: now,
        updated_at: now,
        deleted_at: undefined,
      },
    });

  // Create authentication record
  await MyGlobal.prisma.healthcare_platform_user_authentications.create({
    data: {
      id: v4(),
      user_id: technicianId,
      user_type: "technician",
      provider: "local",
      provider_key: body.email,
      password_hash: passwordHash,
      last_authenticated_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: undefined,
    },
  });

  // Session token and JWT token setup
  const sessionId = v4();
  const sessionToken = v4();
  const refreshToken = v4();

  // Access token (JWT)
  const jwtAccessToken = jwt.sign(
    { id: technicianId, type: "technician" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  // Refresh token (JWT)
  const jwtRefreshToken = jwt.sign(
    { id: technicianId, type: "technician", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Compute expire times
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Create session record
  await MyGlobal.prisma.healthcare_platform_auth_sessions.create({
    data: {
      id: sessionId,
      user_id: technicianId,
      user_type: "technician",
      session_token: sessionToken,
      refresh_token: refreshToken,
      issued_at: now,
      expires_at: accessExpiresAt,
      revoked_at: null,
      user_agent: undefined,
      ip_address: undefined,
    },
  });

  return {
    id: technician.id,
    email: technician.email,
    full_name: technician.full_name,
    license_number: technician.license_number,
    specialty: Object.prototype.hasOwnProperty.call(technician, "specialty")
      ? (technician.specialty ?? null)
      : null,
    phone: Object.prototype.hasOwnProperty.call(technician, "phone")
      ? (technician.phone ?? null)
      : null,
    created_at: toISOStringSafe(technician.created_at),
    updated_at: toISOStringSafe(technician.updated_at),
    deleted_at:
      technician.deleted_at !== undefined && technician.deleted_at !== null
        ? toISOStringSafe(technician.deleted_at)
        : undefined,
    token: {
      access: jwtAccessToken,
      refresh: jwtRefreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
