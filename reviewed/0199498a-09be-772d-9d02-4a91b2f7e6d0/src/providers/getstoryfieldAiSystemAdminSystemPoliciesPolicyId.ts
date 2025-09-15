import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiSystemPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemPolicy";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve detail of a specific system policy from
 * storyfield_ai_system_policies.
 *
 * System administrators can use this endpoint to access the complete definition
 * and lifecycle attributes of a particular platform policy, including code,
 * type, descriptive name, current value, type, enforcement (active), and all
 * relevant modification timestamps. The result includes any archival (soft
 * deleted) state for historic records, as well as compliance notes in the
 * description field.
 *
 * The endpoint requires systemAdmin privileges due to the highly sensitive and
 * operationally impactful nature of policy data. Typical use cases include
 * compliance audits, configuration troubleshooting, or rollback review. All
 * requests validate that the policyId refers to a real and accessible policy,
 * returning not-found or access-denied errors for missing or restricted
 * records. This forms part of the platform's governance and controls dashboard
 * for senior technical staff.
 *
 * @param props - Object containing request parameters
 * @param props.systemAdmin - The authenticated SystemadminPayload (validated at
 *   decorator layer)
 * @param props.policyId - Unique identifier (UUID) for the system policy record
 *   to retrieve
 * @returns The detailed IStoryfieldAiSystemPolicy object for the specified
 *   policyId
 * @throws {Error} When policyId does not correspond to an existing policy
 *   record
 */
export async function getstoryfieldAiSystemAdminSystemPoliciesPolicyId(props: {
  systemAdmin: SystemadminPayload;
  policyId: string & tags.Format<"uuid">;
}): Promise<IStoryfieldAiSystemPolicy> {
  const { policyId } = props;

  // Authorization is enforced upstream by the decorator; no re-check needed here.
  const policy = await MyGlobal.prisma.storyfield_ai_system_policies.findUnique(
    {
      where: { id: policyId },
    },
  );

  if (!policy) {
    throw new Error("Policy not found");
  }

  return {
    id: policy.id,
    policy_code: policy.policy_code,
    name: policy.name,
    description: policy.description,
    value: policy.value,
    type: policy.type,
    active: policy.active,
    created_at: toISOStringSafe(policy.created_at),
    updated_at: toISOStringSafe(policy.updated_at),
    deleted_at: policy.deleted_at ? toISOStringSafe(policy.deleted_at) : null,
  };
}
