import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Deactivate/soft-delete a system policy by ID (storyfield_ai_system_policies
 * table).
 *
 * This API operation allows a system administrator to deactivate (soft delete)
 * a system policy in the 'storyfield_ai_system_policies' table, using the
 * unique policyId. When invoked, the operation sets the deleted_at field to the
 * current timestamp, rendering the policy logically inactive but retaining the
 * record for compliance and potential audit review.
 *
 * No physical deletion from the database occurs; the policy remains available
 * for historical review or temporary reactivation by privileged users. Business
 * integrity, compliance, and traceability are preserved by audit logs and
 * change history. The operation is strictly limited to systemAdmin role, and
 * deactivated policies become unavailable for runtime enforcement or visibility
 * in active system settings endpoints.
 *
 * @param props - Object containing all necessary parameters for the operation
 * @param props.systemAdmin - The authenticated system administrator making the
 *   request
 * @param props.policyId - Unique identifier (UUID) of the system policy to be
 *   soft deleted
 * @returns Void
 * @throws {Error} When the policy does not exist or has already been deleted
 *   (soft-deleted)
 */
export async function deletestoryfieldAiSystemAdminSystemPoliciesPolicyId(props: {
  systemAdmin: SystemadminPayload;
  policyId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find active, not-yet-deleted policy
  const existingPolicy =
    await MyGlobal.prisma.storyfield_ai_system_policies.findFirst({
      where: {
        id: props.policyId,
        deleted_at: null,
      },
    });
  if (!existingPolicy) {
    throw new Error("Policy not found or already soft-deleted");
  }
  // Deactivate policy: set deleted_at and active=false
  await MyGlobal.prisma.storyfield_ai_system_policies.update({
    where: { id: props.policyId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      active: false,
    },
  });
}
