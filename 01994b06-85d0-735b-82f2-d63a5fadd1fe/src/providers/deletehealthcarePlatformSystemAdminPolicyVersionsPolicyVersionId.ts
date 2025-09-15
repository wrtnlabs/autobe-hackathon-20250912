import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Permanently delete a specific policy version by policyVersionId from the
 * healthcare_platform_policy_versions table.
 *
 * This API operation ensures that the specified policy version is removed from
 * the platform's compliance documents registry, targeting
 * healthcare_platform_policy_versions by UUID. The operation checks for the
 * existence of the policy version, throwing an error if not found. Only
 * authenticated system admins are authorized to execute this action. The
 * function performs a hard delete as mandated by current business rules,
 * leaving any historical references in related tables intact.
 *
 * @param props - Object containing the authenticated system admin payload and
 *   the target policyVersionId (UUID)
 * @param props.systemAdmin - SystemadminPayload, represents the authenticated
 *   superuser
 * @param props.policyVersionId - String & tags.Format<'uuid'>, unique
 *   identifier of the policy version to delete
 * @returns Void
 * @throws {Error} When the policy version is not found for deletion
 */
export async function deletehealthcarePlatformSystemAdminPolicyVersionsPolicyVersionId(props: {
  systemAdmin: SystemadminPayload;
  policyVersionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { policyVersionId } = props;
  // Validate existence before deletion to provide clear API error on 404
  const policyVersion =
    await MyGlobal.prisma.healthcare_platform_policy_versions.findUnique({
      where: { id: policyVersionId },
    });
  if (!policyVersion) {
    throw new Error("Policy version not found");
  }
  // Perform hard delete (current business logic does not require soft-deletion)
  await MyGlobal.prisma.healthcare_platform_policy_versions.delete({
    where: { id: policyVersionId },
  });
}
