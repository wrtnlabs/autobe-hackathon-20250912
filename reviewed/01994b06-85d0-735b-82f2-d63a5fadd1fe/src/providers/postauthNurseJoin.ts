import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNurse } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNurse";

/**
 * Register a new nurse account and issue authentication tokens
 * (healthcare_platform_nurses/healthcare_platform_user_authentications).
 *
 * This endpoint creates a new clinical nurse user account in the healthcare
 * platform, enforcing unique email and required fields according to
 * schema/business policy. It hashes and stores the credential using local
 * authentication in the subsidiary user_authentications table and then issues
 * access/refresh tokens per platform standard. Timestamps are strictly
 * formatted as ISO strings for all date/datetime fields. All fields,
 * nullability, and branding match DTO and schema. Profile edit, assignment, and
 * deletion flows are not in scope. Blank required fields, duplicate email, or
 * missing password result in errors.
 *
 * @param props - Object containing the registration payload for nurse account
 *   creation
 * @param props.body - Nurse join request (IHealthcarePlatformNurse.IJoin)
 * @returns Nurse authorized descriptor and authentication tokens
 *   (IHealthcarePlatformNurse.IAuthorized)
 * @throws {Error} If email, full_name, license_number, or password is
 *   missing/blank or already in use
 */
export async function postauthNurseJoin(props: {
  body: IHealthcarePlatformNurse.IJoin;
}): Promise<IHealthcarePlatformNurse.IAuthorized> {
  const { body } = props;
  const { email, full_name, license_number, specialty, phone, password } = body;

  // 1. Validate required fields (no blank allowed)
  if (!email || email.trim() === "") throw new Error("Email is required");
  if (!full_name || full_name.trim() === "")
    throw new Error("Full name is required");
  if (!license_number || license_number.trim() === "")
    throw new Error("License number is required");
  if (!password || password.trim() === "")
    throw new Error("Password is required");

  // 2. Check for duplicate by email (must not exist)
  const existing = await MyGlobal.prisma.healthcare_platform_nurses.findUnique({
    where: { email },
  });
  if (existing) throw new Error("Nurse with this email already exists");

  // 3. Hash password using MyGlobal.password facility
  const hashedPassword = await MyGlobal.password.hash(password);

  // 4. Prepare UUID and timestamps
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const nurseId: string & tags.Format<"uuid"> = v4();

  // 5. Create nurse record
  const nurse = await MyGlobal.prisma.healthcare_platform_nurses.create({
    data: {
      id: nurseId,
      email,
      full_name,
      license_number,
      specialty: specialty ?? null,
      phone: phone ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 6. Store authentication record (local strategy)
  await MyGlobal.prisma.healthcare_platform_user_authentications.create({
    data: {
      id: v4(),
      user_id: nurse.id,
      user_type: "nurse",
      provider: "local",
      provider_key: nurse.email,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // 7. JWT expiration times and token creation
  const accessExpireMs = 60 * 60 * 1000; // 1 hour
  const refreshExpireMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  const accessExpireDate = new Date(Date.now() + accessExpireMs);
  const refreshExpireDate = new Date(Date.now() + refreshExpireMs);
  const expired_at: string & tags.Format<"date-time"> =
    toISOStringSafe(accessExpireDate);
  const refreshable_until: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshExpireDate);
  const access = jwt.sign(
    { id: nurse.id, type: "nurse" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    { id: nurse.id, type: "nurse", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // 8. Structure response as specified
  return {
    id: nurse.id,
    email: nurse.email,
    full_name: nurse.full_name,
    license_number: nurse.license_number,
    specialty: nurse.specialty ?? null,
    phone: nurse.phone ?? null,
    created_at: toISOStringSafe(nurse.created_at),
    updated_at: toISOStringSafe(nurse.updated_at),
    deleted_at: nurse.deleted_at ? toISOStringSafe(nurse.deleted_at) : null,
    token: {
      access,
      refresh,
      expired_at,
      refreshable_until,
    },
  };
}
