import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new system administrator (healthcare_platform_systemadmins)
 *
 * Creates a new system administrator account to manage the healthcarePlatform
 * system. Only current system admins may create new admin accounts.
 *
 * This operation requires required fields such as email (unique, business
 * domain), full legal name, and may include business phone for account
 * validation/MFA. Upon creation, the admin's created_at and updated_at fields
 * are set per platform defaults. The newly created admin account is returned in
 * full, but without credential hashes or sensitive authentication data.
 *
 * Failure scenarios include uniqueness violations, missing required fields, or
 * permission errors. This is a sensitive endpoint governed by the highest level
 * of audit, requiring that invokers themselves be privileged systemAdmin
 * users.
 *
 * @param props - Object containing SystemadminPayload for authentication and
 *   ICreate for new admin fields
 * @param props.systemAdmin - Authenticated admin performing this operation
 * @param props.body - New admin creation fields (email, full_name, phone)
 * @returns The created admin profile (business fields, never credentials)
 * @throws {Error} When unauthorized, required fields missing, email domain
 *   invalid, or email already in use
 */
export async function posthealthcarePlatformSystemAdminSystemadmins(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformSystemAdmin.ICreate;
}): Promise<IHealthcarePlatformSystemAdmin> {
  const { systemAdmin, body } = props;

  // Authorization: Only allow existing systemAdmin
  if (!systemAdmin || systemAdmin.type !== "systemAdmin") {
    throw new Error(
      "Unauthorized: Only system admin can create new system admins.",
    );
  }

  // Validate required fields
  if (!body.email || !body.full_name) {
    throw new Error(
      "Missing required fields: email and full_name are required.",
    );
  }

  // Reject common personal mail domains
  const prohibitedDomains = [
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "icloud.com",
    "naver.com",
    "daum.net",
    "hanmail.net",
    "protonmail.com",
    "aol.com",
  ];
  const emailSplit = body.email.split("@");
  const emailDomain = emailSplit.length > 1 ? emailSplit[1].toLowerCase() : "";
  if (!emailDomain || prohibitedDomains.includes(emailDomain)) {
    throw new Error(
      "Email domain is not permitted. Please use a business email address.",
    );
  }

  // Check uniqueness (ignore records soft-deleted)
  const existing =
    await MyGlobal.prisma.healthcare_platform_systemadmins.findFirst({
      where: { email: body.email, deleted_at: null },
    });
  if (existing) {
    throw new Error("A system admin with that email already exists.");
  }

  const now = toISOStringSafe(new Date());
  // Insert the new sysadmin
  const created = await MyGlobal.prisma.healthcare_platform_systemadmins.create(
    {
      data: {
        id: v4(),
        email: body.email,
        full_name: body.full_name,
        phone: body.phone === undefined ? null : body.phone,
        created_at: now,
        updated_at: now,
        // deleted_at omitted on creation
      },
    },
  );

  // Return DTO-compliant fields only (no credential data)
  return {
    id: created.id,
    email: created.email,
    full_name: created.full_name,
    phone: created.phone ?? null,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at:
      typeof created.deleted_at !== "undefined" && created.deleted_at !== null
        ? created.deleted_at
        : undefined,
  };
}
