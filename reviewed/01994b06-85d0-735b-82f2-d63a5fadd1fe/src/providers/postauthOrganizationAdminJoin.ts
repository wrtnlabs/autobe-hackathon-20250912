import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Register a new healthcare platform organization administrator.
 *
 * This operation creates a new admin record in the
 * healthcare_platform_organizationadmins table and corresponding authentication
 * record for password or SSO join. It strictly checks email uniqueness (soft-
 * deleted records block re-registration), validates password policy (min 8, at
 * least one letter and one digit/special), and issues proper JWT tokens for
 * authentication using the required payload structure. Result types use only
 * ISO string datetime, v4 UUIDs, and null/undefined precisely matching DTO.
 *
 * @param props - Object containing the registration body for organization admin
 * @param props.body - Organization admin registration data
 *   (IHealthcarePlatformOrganizationAdmin.IJoin)
 * @returns IHealthcarePlatformOrganizationAdmin.IAuthorized response containing
 *   admin info and JWT tokens
 * @throws {Error} If email is duplicate, password policy fails, or credential
 *   setup fails
 */
export async function postauthOrganizationAdminJoin(props: {
  body: IHealthcarePlatformOrganizationAdmin.IJoin;
}): Promise<IHealthcarePlatformOrganizationAdmin.IAuthorized> {
  const { body } = props;

  // Step 1: Check duplicate email (non-soft deleted)
  const existing =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findUnique({
      where: { email: body.email },
    });
  if (existing && !existing.deleted_at) {
    throw new Error("Duplicate organization admin email.");
  }

  // Step 2: Validate password: if SSO/federated skip, else must be present & strong
  const isFederated = body.provider !== undefined && body.provider !== null;
  let passwordHash: string | null = null;
  if (!isFederated) {
    // Password is required. Enforce policy: min 8, at least 1 letter and 1 digit/special.
    if (!body.password || body.password.length < 8) {
      throw new Error("Password must be at least 8 characters long.");
    }
    if (
      !/[A-Za-z]/.test(body.password) ||
      !/[0-9!@#$%^&*()_+=\-\[\]{};':",.<>/?]/.test(body.password)
    ) {
      throw new Error(
        "Password must contain at least one letter and one number or special character.",
      );
    }
    // Hash password
    passwordHash = await MyGlobal.password.hash(body.password);
  }

  // Step 3: Transactionally create admin and authentication records
  const adminId = v4();
  const now = toISOStringSafe(new Date());
  const [admin] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.healthcare_platform_organizationadmins.create({
      data: {
        id: adminId,
        email: body.email,
        full_name: body.full_name,
        phone: body.phone !== undefined ? body.phone : null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    }),
    MyGlobal.prisma.healthcare_platform_user_authentications.create({
      data: {
        id: v4(),
        user_id: adminId,
        user_type: "organizationadmin",
        provider: isFederated ? body.provider! : "local",
        provider_key: isFederated
          ? (body.provider_key ?? body.email)
          : body.email,
        password_hash: passwordHash,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    }),
  ]);

  // Step 4: JWT Token generation with correct payload/expiration
  // Access token payload
  const jwtAccessPayload = {
    id: adminId,
    type: "organizationadmin",
  };
  // Calculate expiries
  const expiresInSec = 60 * 60; // 1 hour
  const refreshSec = 60 * 60 * 24 * 7; // 7 days
  const expiresAt = toISOStringSafe(new Date(Date.now() + expiresInSec * 1000));
  const refreshAt = toISOStringSafe(new Date(Date.now() + refreshSec * 1000));

  const accessToken = jwt.sign(jwtAccessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: expiresInSec,
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { id: adminId, type: "organizationadmin", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: refreshSec, issuer: "autobe" },
  );
  // Step 5: Return DTO structure
  return {
    id: admin.id,
    email: admin.email,
    full_name: admin.full_name,
    phone: admin.phone !== undefined ? admin.phone : null,
    created_at: now,
    updated_at: now,
    deleted_at: undefined, // not present immediately after join
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiresAt,
      refreshable_until: refreshAt,
    },
  };
}
