import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserMfaFactor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserMfaFactor";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update user MFA factor configuration and settings.
 *
 * Modifies an existing user MFA factor record addressed by userMfaFactorId,
 * allowing changes to MFA factor type, value, priority, or enabled status as
 * requested by an organization admin. Only permitted fields are updated. For
 * security, the returned factor_value is masked. Throws Error for not-found
 * targets, empty update payloads, or missing permissions.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated organization admin user
 *   payload
 * @param props.userMfaFactorId - UUID of the MFA factor to update
 * @param props.body - The patch/partial update fields for MFA configuration
 * @returns The updated MFA factor record with sensitive credential masked
 * @throws {Error} If the MFA factor does not exist or update payload is empty.
 */
export async function puthealthcarePlatformOrganizationAdminUserMfaFactorsUserMfaFactorId(props: {
  organizationAdmin: OrganizationadminPayload;
  userMfaFactorId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformUserMfaFactor.IUpdate;
}): Promise<IHealthcarePlatformUserMfaFactor> {
  const { organizationAdmin, userMfaFactorId, body } = props;

  // 1. Lookup: Only proceed if record exists
  const old =
    await MyGlobal.prisma.healthcare_platform_user_mfa_factors.findFirst({
      where: {
        id: userMfaFactorId,
      },
    });
  if (!old) throw new Error("MFA factor not found");

  // 2. Prepare update: Only permitted fields
  const update: IHealthcarePlatformUserMfaFactor.IUpdate = {
    factor_type: body.factor_type ?? undefined,
    factor_value: body.factor_value ?? undefined,
    priority: body.priority ?? undefined,
    is_active: body.is_active ?? undefined,
    updated_at: body.updated_at ?? toISOStringSafe(new Date()),
  };

  // 3. Prevent empty/blank update
  if (!Object.values(update).some((v) => v !== undefined))
    throw new Error("No update fields provided");

  // 4. Perform update
  const updated =
    await MyGlobal.prisma.healthcare_platform_user_mfa_factors.update({
      where: { id: userMfaFactorId },
      data: update,
    });

  // 5. Mask the credential value (factor_value)
  return {
    id: updated.id,
    user_id: updated.user_id,
    user_type: updated.user_type,
    factor_type: updated.factor_type,
    // Masking algorithm: always return a fixed mask if value present
    factor_value:
      updated.factor_value && updated.factor_value.length > 0
        ? "****MASKED****"
        : "",
    priority: updated.priority,
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
