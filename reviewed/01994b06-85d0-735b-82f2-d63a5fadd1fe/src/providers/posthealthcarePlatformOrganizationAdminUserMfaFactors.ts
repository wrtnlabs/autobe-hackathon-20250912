import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserMfaFactor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserMfaFactor";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new user MFA factor for a user (TOTP, SMS, email, etc).
 *
 * This endpoint adds a new multi-factor authentication (MFA) factor record for
 * a user within the healthcarePlatform system. Used by organization admins to
 * provision TOTP, SMS, email, or other supported MFA factors, typically for
 * onboarding, credential rotation, or compliance requirements. Only system and
 * organization-level admins are permitted to create MFA factors directly for
 * other users; this operation is audited for compliance.
 *
 * The operation enforces uniqueness: only one MFA factor per (user_id,
 * user_type, factor_type, priority) is allowed. If a conflicting record exists,
 * the creation is denied. The credential secret value is always redacted from
 * the output for security. Audit log creation is expected but not implemented
 * in this function; see compliance requirements.
 *
 * @param props - Required properties for MFA factor creation.
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the operation.
 * @param props.body - The MFA factor creation data, including user, factor
 *   type, value, priority, and status.
 * @returns The created MFA factor record (secret redacted) with all
 *   configuration metadata.
 * @throws {Error} When a duplicate or conflicting MFA factor exists for the
 *   given user/type/factor/priority.
 */
export async function posthealthcarePlatformOrganizationAdminUserMfaFactors(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformUserMfaFactor.ICreate;
}): Promise<IHealthcarePlatformUserMfaFactor> {
  const { body } = props;

  // 1. Enforce uniqueness: only one MFA factor per (user_id, user_type, factor_type, priority)
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_user_mfa_factors.findFirst({
      where: {
        user_id: body.user_id,
        user_type: body.user_type,
        factor_type: body.factor_type,
        priority: body.priority,
      },
    });
  if (duplicate) {
    throw new Error(
      `A MFA factor of type "${body.factor_type}" (priority ${body.priority}) already exists for this user. ` +
        "Modify or remove the existing factor before creating a new one.",
    );
  }

  // 2. Prepare timestamps and generate UUID
  const now = toISOStringSafe(new Date());

  // 3. Create MFA factor in database
  const created =
    await MyGlobal.prisma.healthcare_platform_user_mfa_factors.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        user_id: body.user_id,
        user_type: body.user_type,
        factor_type: body.factor_type,
        factor_value: body.factor_value,
        priority: body.priority,
        is_active: body.is_active,
        created_at: now,
        updated_at: now,
      },
    });

  // 4. Return DTO, redacting credential field for output security
  return {
    id: created.id,
    user_id: created.user_id,
    user_type: created.user_type,
    factor_type: created.factor_type,
    factor_value: "", // Redacted output for security
    priority: created.priority,
    is_active: created.is_active,
    created_at: now, // Use prepared value for type safety
    updated_at: now,
  };
}
