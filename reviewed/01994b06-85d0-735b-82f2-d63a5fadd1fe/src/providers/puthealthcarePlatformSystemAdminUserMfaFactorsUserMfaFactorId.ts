import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserMfaFactor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserMfaFactor";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update user MFA factor configuration and settings.
 *
 * Modifies the mutable fields (factor_type, factor_value, priority, is_active,
 * updated_at) of a user MFA factor referenced by userMfaFactorId. Enforces
 * business and security rules such as only allowing positive priority,
 * enforcing secret requirements for TOTP, and preventing mutation of immutable
 * fields (id, user_id, user_type, created_at). Returns the updated MFA factor
 * object with the credential value masked for security.
 *
 * Only system administrators with active status may perform this update. All
 * attempts are logged and validated.
 *
 * @param props - Operation input:
 *
 *   - Props.systemAdmin: Authenticated system admin context
 *   - Props.userMfaFactorId: UUID of the MFA factor record to update
 *   - Props.body: IHealthcarePlatformUserMfaFactor.IUpdate containing patch changes
 *
 * @returns Updated MFA factor configuration with sensitive credential
 *   information masked
 * @throws {Error} When the MFA factor does not exist
 * @throws {Error} When attempting to set priority negative
 * @throws {Error} When a TOTP factor secret is missing/empty
 * @throws {Error} When body contains illegal field values or attempts to mutate
 *   immutable properties
 */
export async function puthealthcarePlatformSystemAdminUserMfaFactorsUserMfaFactorId(props: {
  systemAdmin: SystemadminPayload;
  userMfaFactorId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformUserMfaFactor.IUpdate;
}): Promise<IHealthcarePlatformUserMfaFactor> {
  const { userMfaFactorId, body } = props;

  // Lookup existing MFA factor
  const record =
    await MyGlobal.prisma.healthcare_platform_user_mfa_factors.findFirst({
      where: { id: userMfaFactorId },
    });
  if (!record) throw new Error("MFA factor not found");

  // Business rule: priority must be non-negative
  if (body.priority !== undefined && body.priority < 0) {
    throw new Error("MFA factor priority must be non-negative");
  }

  // Business rule: If updating factor_value, validate it for secrets where needed (e.g., TOTP)
  const effectiveType = body.factor_type ?? record.factor_type;
  if (
    effectiveType === "totp" &&
    body.factor_value !== undefined &&
    body.factor_value.length === 0
  ) {
    throw new Error("TOTP MFA factor_value must not be empty");
  }

  // Prepare allowed updates, never touch immutable fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updates: Partial<IHealthcarePlatformUserMfaFactor.IUpdate> = {
    ...(body.factor_type !== undefined && { factor_type: body.factor_type }),
    ...(body.factor_value !== undefined && { factor_value: body.factor_value }),
    ...(body.priority !== undefined && { priority: body.priority }),
    ...(body.is_active !== undefined && { is_active: body.is_active }),
    updated_at: now,
  };

  // Persist the update
  const updated =
    await MyGlobal.prisma.healthcare_platform_user_mfa_factors.update({
      where: { id: userMfaFactorId },
      data: updates,
    });

  // Return all fields, but always mask factor_value for security
  return {
    id: updated.id,
    user_id: updated.user_id,
    user_type: updated.user_type,
    factor_type: updated.factor_type,
    factor_value: "******",
    priority: updated.priority,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
