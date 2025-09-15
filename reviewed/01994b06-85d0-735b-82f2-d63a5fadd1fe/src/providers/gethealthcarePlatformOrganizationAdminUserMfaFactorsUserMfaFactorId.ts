import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformUserMfaFactor } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformUserMfaFactor";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Get full detail of a user MFA factor by ID.
 *
 * Retrieves the complete configuration and audit metadata for a specific MFA
 * factor record (identified by userMfaFactorId) from
 * healthcare_platform_user_mfa_factors. For use by authenticated organization
 * admins only. Enforces strict RBAC—admins may only access MFA factors
 * associated with their own user account. Returns details for security audit or
 * troubleshooting, but never exposes credential secrets or deleted MFA
 * records.
 *
 * @param props - Operation params
 * @param props.organizationAdmin - Payload for the authenticated organization
 *   admin (OrganizationadminPayload)
 * @param props.userMfaFactorId - UUID of the MFA factor to retrieve
 * @returns The complete configuration and metadata of the MFA factor
 * @throws {Error} If the MFA factor is not found, deleted, or the admin is not
 *   authorized to access it
 */
export async function gethealthcarePlatformOrganizationAdminUserMfaFactorsUserMfaFactorId(props: {
  organizationAdmin: OrganizationadminPayload;
  userMfaFactorId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformUserMfaFactor> {
  const { organizationAdmin, userMfaFactorId } = props;
  // Query record: no deleted_at field present in schema
  const factor =
    await MyGlobal.prisma.healthcare_platform_user_mfa_factors.findFirst({
      where: {
        id: userMfaFactorId,
      },
    });
  if (!factor) {
    throw new Error("MFA factor not found");
  }
  // RBAC: Only allow the admin to access their own MFA factor (matching user_id and user_type)
  if (
    factor.user_id !== organizationAdmin.id ||
    factor.user_type !== "orgadmin"
  ) {
    // Do not leak existence: use ambiguous error
    throw new Error("Unauthorized or not found");
  }
  // Build DTO strictly according to IHealthcarePlatformUserMfaFactor (no extras, all conversions)
  return {
    id: factor.id,
    user_id: factor.user_id,
    user_type: factor.user_type,
    factor_type: factor.factor_type,
    factor_value: factor.factor_value,
    priority: factor.priority,
    is_active: factor.is_active,
    created_at: toISOStringSafe(factor.created_at),
    updated_at: toISOStringSafe(factor.updated_at),
  };
}
