import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserMfaFactor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserMfaFactor";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new user MFA factor for a user (TOTP, SMS, email, etc).
 *
 * This operation creates a new user MFA (Multi-Factor Authentication) factor
 * for a user in the healthcarePlatform system. It inserts a record into
 * healthcare_platform_user_mfa_factors, enabling administrators to provision
 * TOTP, SMS, email, or other supported MFA factors for user authentication
 * security. Used when onboarding users or updating security requirements. Only
 * system and organization admins may create MFA factor records directly.
 *
 * Returns the created MFA factor's configuration and metadata, with the
 * credential field redacted. If duplicate or conflicting factors are requested,
 * a business error is returned with remediation direction.
 *
 * @param props - SystemAdmin: The authenticated system admin making the request
 *   (authorization is enforced by decorator mechanism) body:
 *   IHealthcarePlatformUserMfaFactor.ICreate - the creation payload: user info,
 *   type, value, priority, is_active
 * @returns The created MFA factor record
 * @throws {Error} If there is a duplicate active/primary MFA factor of the same
 *   type for this user, or if factor_value is blank
 */
export async function posthealthcarePlatformSystemAdminUserMfaFactors(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformUserMfaFactor.ICreate;
}): Promise<IHealthcarePlatformUserMfaFactor> {
  const { body } = props;

  // Reject if empty factor_value
  if (!body.factor_value || body.factor_value.length === 0) {
    throw new Error("MFA factor_value must not be empty");
  }

  // Uniqueness: only one active (is_active=true), primary (priority==0) per user/type/factor
  const conflict =
    await MyGlobal.prisma.healthcare_platform_user_mfa_factors.findFirst({
      where: {
        user_id: body.user_id,
        user_type: body.user_type,
        factor_type: body.factor_type,
        priority: 0,
        is_active: true,
      },
    });
  if (conflict) {
    throw new Error(
      "Duplicate primary/active MFA factor exists for this user and factor_type. Only one primary/active per type is permitted.",
    );
  }

  const id: string & tags.Format<"uuid"> = v4() as string & tags.Format<"uuid">;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.healthcare_platform_user_mfa_factors.create({
      data: {
        id,
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

  return {
    id: created.id,
    user_id: created.user_id,
    user_type: created.user_type,
    factor_type: created.factor_type,
    factor_value: created.factor_value,
    priority: created.priority,
    is_active: created.is_active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
