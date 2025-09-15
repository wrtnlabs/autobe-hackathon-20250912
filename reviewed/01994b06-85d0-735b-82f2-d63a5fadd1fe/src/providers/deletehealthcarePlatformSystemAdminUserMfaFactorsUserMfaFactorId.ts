import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently deletes a user multi-factor authentication (MFA) factor by its
 * ID.
 *
 * This operation removes a specific MFA factor from the
 * healthcare_platform_user_mfa_factors table, ensuring it is permanently
 * deleted and unrecoverable. The operation is strictly for administrative or
 * security purposes and must be fully auditable. It verifies the existence of
 * the factor before deletion and records an audit log with all relevant
 * metadata for compliance.
 *
 * @param props - Props object containing:
 *
 *   - SystemAdmin: The authenticated SystemadminPayload performing the action (must
 *       be authorized)
 *   - UserMfaFactorId: The UUID of the MFA factor to delete
 *
 * @returns Void
 * @throws Error if the MFA factor does not exist or was already deleted
 */
export async function deletehealthcarePlatformSystemAdminUserMfaFactorsUserMfaFactorId(props: {
  systemAdmin: SystemadminPayload;
  userMfaFactorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, userMfaFactorId } = props;

  // Step 1: Check existence before deletion
  const factor =
    await MyGlobal.prisma.healthcare_platform_user_mfa_factors.findUnique({
      where: { id: userMfaFactorId },
    });
  if (!factor) {
    throw new Error("MFA factor not found or already deleted");
  }

  // Step 2: Delete MFA factor
  await MyGlobal.prisma.healthcare_platform_user_mfa_factors.delete({
    where: { id: userMfaFactorId },
  });

  // Step 3: Audit log the deletion
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: systemAdmin.id,
      organization_id: null,
      action_type: "MFA_FACTOR_DELETE",
      event_context: JSON.stringify({
        deleted_factor_id: userMfaFactorId,
        deleted_factor_type: factor.factor_type,
        affected_user_id: factor.user_id,
        performed_by: "systemAdmin",
      }),
      ip_address: undefined,
      related_entity_type: "MFA_FACTOR",
      related_entity_id: userMfaFactorId,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
