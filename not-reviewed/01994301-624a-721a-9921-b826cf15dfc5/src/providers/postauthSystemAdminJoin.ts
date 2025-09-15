import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";

/**
 * Register a new system administrator (ats_recruitment_systemadmins table) and
 * issue initial JWT tokens.
 *
 * This endpoint allows public, invitation-based registration of a new system
 * administrator. The operation strictly checks for email uniqueness (no
 * duplicate registration), enforces password strength requirements, securely
 * hashes the provided password, and stores only the necessary fields.
 * Registration is fully auditable and logs the event in the audit trails for
 * compliance and traceability. Upon successful registration, the admin receives
 * access and refresh JWT tokens per system security standards. Deleted accounts
 * are not included in the join operation.
 *
 * @param props - Registration properties
 * @param props.body - Admin registration information: email (must be unique),
 *   password (will be hashed), name, super_admin flag
 * @returns The newly created, authorized system admin data with JWT tokens
 * @throws {Error} If the email is already registered
 * @throws {Error} If the password does not meet security requirements
 */
export async function postauthSystemAdminJoin(props: {
  body: IAtsRecruitmentSystemAdmin.ICreate;
}): Promise<IAtsRecruitmentSystemAdmin.IAuthorized> {
  const { body } = props;

  // 1. Check for duplicate email
  const duplicate =
    await MyGlobal.prisma.ats_recruitment_systemadmins.findUnique({
      where: { email: body.email },
    });
  if (duplicate) {
    throw new Error("Email already registered");
  }

  // 2. Strong password validation (min 8 chars, upper/lower/number/symbol)
  if (
    typeof body.password !== "string" ||
    body.password.length < 8 ||
    !/[A-Z]/.test(body.password) ||
    !/[a-z]/.test(body.password) ||
    !/[0-9]/.test(body.password) ||
    !/[^A-Za-z0-9]/.test(body.password)
  ) {
    throw new Error(
      "Password does not meet security requirements (min 8 characters, including uppercase, lowercase, number, and symbol)",
    );
  }

  // 3. Hash password
  const password_hash = await MyGlobal.password.hash(body.password);

  // 4. Prepare new admin fields
  const id = v4();
  const now = toISOStringSafe(new Date());

  // 5. Create the system admin record
  const created = await MyGlobal.prisma.ats_recruitment_systemadmins.create({
    data: {
      id: id,
      email: body.email,
      password_hash: password_hash,
      name: body.name,
      super_admin: body.super_admin,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  });

  // 6. JWT tokens
  const accessTokenExpiresInMs = 60 * 60 * 1000;
  const refreshTokenExpiresInMs = 7 * 24 * 60 * 60 * 1000;
  const accessTokenExp = toISOStringSafe(
    new Date(Date.now() + accessTokenExpiresInMs),
  );
  const refreshTokenExp = toISOStringSafe(
    new Date(Date.now() + refreshTokenExpiresInMs),
  );

  const access = jwt.sign(
    { id: created.id, type: "systemadmin" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const refresh = jwt.sign(
    { id: created.id, type: "systemadmin", tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // 7. Audit registration event
  await MyGlobal.prisma.ats_recruitment_audit_trails.create({
    data: {
      id: v4(),
      event_timestamp: now,
      actor_id: created.id,
      actor_role: "systemadmin",
      operation_type: "CREATE",
      target_type: "systemadmin",
      target_id: created.id,
      event_detail: `System admin account registered: email=${created.email}`,
      ip_address: undefined,
      user_agent: undefined,
      created_at: now,
      updated_at: now,
    },
  });

  // 8. Format response
  return {
    id: created.id,
    email: created.email,
    name: created.name,
    super_admin: created.super_admin,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== undefined && created.deleted_at !== null
        ? toISOStringSafe(created.deleted_at)
        : null,
    token: {
      access: access,
      refresh: refresh,
      expired_at: accessTokenExp,
      refreshable_until: refreshTokenExp,
    },
  };
}
