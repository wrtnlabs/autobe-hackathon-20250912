import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Permanently deletes a specific policy version by its unique policyVersionId
 * from the healthcare_platform_policy_versions table.
 *
 * This operation performs a hard delete (no soft-delete/archival) of a
 * compliance policy version. It enforces organization-based authorization: Only
 * organization admins may delete policy versions that belong to their own
 * organization. The deleted record is removed entirely and does not affect
 * linked consents or agreements, but regulatory audit trail considerations
 * apply. If the policy version is not found or does not belong to the
 * authenticated organization admin, an error is thrown.
 *
 * @param props - Properties required for deletion
 * @param props.organizationAdmin - The authenticated organization admin payload
 * @param props.policyVersionId - UUID of the policy version to delete
 * @returns Void
 * @throws {Error} If the policy version does not exist
 * @throws {Error} If the policy version does not belong to your organization
 */
export async function deletehealthcarePlatformOrganizationAdminPolicyVersionsPolicyVersionId(props: {
  organizationAdmin: OrganizationadminPayload;
  policyVersionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, policyVersionId } = props;

  // 1. Find the policy version by id
  const policyVersion =
    await MyGlobal.prisma.healthcare_platform_policy_versions.findUnique({
      where: { id: policyVersionId },
    });
  if (!policyVersion) {
    throw new Error("Policy version not found");
  }
  // 2. Check organization ownership
  if (policyVersion.organization_id !== organizationAdmin.id) {
    throw new Error(
      "Unauthorized: Policy version does not belong to your organization",
    );
  }
  // 3. Hard delete
  await MyGlobal.prisma.healthcare_platform_policy_versions.delete({
    where: { id: policyVersionId },
  });
}
