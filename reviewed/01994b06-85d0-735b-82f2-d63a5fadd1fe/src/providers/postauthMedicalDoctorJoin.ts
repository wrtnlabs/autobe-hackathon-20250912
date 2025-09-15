import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformMedicalDoctor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalDoctor";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Registers a new licensed medical doctor as a system user, validates all
 * provided credentials, and issues JWT access/refresh tokens for future use.
 *
 * This join operation validates email, full name, NPI number, and password
 * (minimum 8 chars); enforces uniqueness for email and NPI; hashes the password
 * using the platform hash utility; creates both a doctor profile and
 * authentication record; calculates token expiry in ISO string format; and
 * issues JWT tokens with compliant payloads. No credential hashes are exposed
 * in the response. All date, timestamp, and ID values are handled using
 * platform branding rules and utility functions.
 *
 * @param props - The props for registration, containing body fields from
 *   IHealthcarePlatformMedicalDoctor.IJoin
 * @returns Authorized doctor profile and JWT tokens if successful
 * @throws {Error} If required fields are missing, weak password, or duplicate
 *   email/NPI is found
 */
export async function postauthMedicalDoctorJoin(props: {
  medicalDoctor: MedicaldoctorPayload;
  body: IHealthcarePlatformMedicalDoctor.IJoin;
}): Promise<IHealthcarePlatformMedicalDoctor.IAuthorized> {
  const { body } = props;
  // Validate required fields
  if (!body.email || !body.full_name || !body.npi_number || !body.password) {
    throw new Error(
      "Missing required registration fields: email, full_name, npi_number, password",
    );
  }
  if (body.password.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }

  // Ensure unique email
  const emailExists =
    await MyGlobal.prisma.healthcare_platform_medicaldoctors.findFirst({
      where: { email: body.email },
    });
  if (emailExists) {
    throw new Error("A medical doctor with this email is already registered");
  }

  // Ensure unique NPI number
  const npiExists =
    await MyGlobal.prisma.healthcare_platform_medicaldoctors.findFirst({
      where: { npi_number: body.npi_number },
    });
  if (npiExists) {
    throw new Error(
      "A medical doctor with this NPI number is already registered",
    );
  }

  // Hash the password
  const passwordHash = await MyGlobal.password.hash(body.password);

  // Prepare identifiers and timestamps
  const doctorId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create records atomically
  const doctor =
    await MyGlobal.prisma.healthcare_platform_medicaldoctors.create({
      data: {
        id: doctorId,
        email: body.email,
        full_name: body.full_name,
        npi_number: body.npi_number,
        specialty: body.specialty ?? null,
        phone: body.phone ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  await MyGlobal.prisma.healthcare_platform_user_authentications.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: doctorId,
      user_type: "medicalDoctor",
      provider: "local",
      provider_key: body.email,
      password_hash: passwordHash,
      last_authenticated_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Token timing calculation
  const accessExpiresMs = 60 * 60 * 1000;
  const refreshExpiresMs = 7 * 24 * 60 * 60 * 1000;
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + accessExpiresMs),
  );
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + refreshExpiresMs),
  );

  // JWT tokens
  const accessToken = jwt.sign(
    { id: doctorId, type: "medicalDoctor" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: Math.floor(accessExpiresMs / 1000), issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    { id: doctorId, type: "medicalDoctor", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: Math.floor(refreshExpiresMs / 1000), issuer: "autobe" },
  );

  return {
    id: doctor.id,
    email: doctor.email,
    full_name: doctor.full_name,
    npi_number: doctor.npi_number,
    specialty:
      doctor.specialty === undefined || doctor.specialty === null
        ? undefined
        : doctor.specialty,
    phone:
      doctor.phone === undefined || doctor.phone === null
        ? undefined
        : doctor.phone,
    created_at: doctor.created_at,
    updated_at: doctor.updated_at,
    deleted_at:
      doctor.deleted_at === undefined || doctor.deleted_at === null
        ? undefined
        : doctor.deleted_at,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
