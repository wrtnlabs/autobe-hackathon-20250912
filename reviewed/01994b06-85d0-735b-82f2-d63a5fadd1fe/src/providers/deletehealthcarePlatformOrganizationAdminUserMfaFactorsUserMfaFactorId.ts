import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Permanently delete a user MFA (multi-factor authentication) factor.
 *
 * This endpoint deletes the MFA factor identified by userMfaFactorId from the
 * healthcare_platform_user_mfa_factors table. Intended for system or
 * organization administrators to support account recovery, remediate security
 * issues, or fulfill user/officer requests. All deletions are fully auditable,
 * and the deletion event is recorded in the audit log table with relevant
 * action and context.
 *
 * @param props - Operation arguments
 * @param props.organizationAdmin - Authenticated OrganizationadminPayload (the
 *   admin performing deletion)
 * @param props.userMfaFactorId - UUID of the MFA factor to delete (must exist)
 * @returns Void on success. Throws Error if not found or already deleted.
 * @throws {Error} If no such MFA factor exists.
 */
export async function deletehealthcarePlatformOrganizationAdminUserMfaFactorsUserMfaFactorId(props: {
  organizationAdmin: OrganizationadminPayload;
  userMfaFactorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, userMfaFactorId } = props;

  // 1. Ensure MFA factor exists
  const factor =
    await MyGlobal.prisma.healthcare_platform_user_mfa_factors.findUnique({
      where: { id: userMfaFactorId },
    });
  if (!factor) {
    throw new Error("MFA factor not found or already deleted");
  }

  // 2. Delete MFA factor (hard delete)
  await MyGlobal.prisma.healthcare_platform_user_mfa_factors.delete({
    where: { id: userMfaFactorId },
  });

  // 3. Write audit log event for regulatory tracking
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: organizationAdmin.id,
      organization_id: undefined,
      action_type: "MFA_FACTOR_DELETED",
      event_context: JSON.stringify({
        mfa_factor_id: userMfaFactorId,
        admin_id: organizationAdmin.id,
        reason: "admin-initiated removal",
      }),
      ip_address: undefined,
      related_entity_type: "healthcare_platform_user_mfa_factors",
      related_entity_id: userMfaFactorId,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
