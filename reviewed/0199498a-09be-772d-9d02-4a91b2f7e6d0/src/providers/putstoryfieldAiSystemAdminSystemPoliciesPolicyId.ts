import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiSystemPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemPolicy";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Updates a system policy by ID (storyfield_ai_system_policies table).
 *
 * This endpoint enables administrators to update an existing policy record in
 * the storyfield_ai_system_policies table. Only the fields name, description,
 * value, type, and active are updatable; the policy_code is immutable. The
 * updated_at timestamp is refreshed for audit purposes. Throws if the policy
 * doesn't exist or is soft-deleted. Authorization enforced via systemAdmin
 * props.
 *
 * @param props - Request properties
 * @param props.systemAdmin - Authenticated system admin performing the
 *   operation
 * @param props.policyId - UUID of the policy record to update
 * @param props.body - Patch object with updated fields (all optional)
 * @returns The full updated IStoryfieldAiSystemPolicy object
 * @throws {Error} When the policy ID is not found or is soft-deleted
 */
export async function putstoryfieldAiSystemAdminSystemPoliciesPolicyId(props: {
  systemAdmin: SystemadminPayload;
  policyId: string & tags.Format<"uuid">;
  body: IStoryfieldAiSystemPolicy.IUpdate;
}): Promise<IStoryfieldAiSystemPolicy> {
  const { policyId, body } = props;

  // Find the policy, ensure it's not soft-deleted
  const original =
    await MyGlobal.prisma.storyfield_ai_system_policies.findFirst({
      where: { id: policyId, deleted_at: null },
    });
  if (!original) throw new Error("Policy not found");

  // Only update present properties (skip omitted ones)
  const now = toISOStringSafe(new Date());
  const updateFields = {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.description !== undefined
      ? { description: body.description }
      : {}),
    ...(body.value !== undefined ? { value: body.value } : {}),
    ...(body.type !== undefined ? { type: body.type } : {}),
    ...(body.active !== undefined ? { active: body.active } : {}),
    updated_at: now,
  } satisfies Partial<
    Omit<
      IStoryfieldAiSystemPolicy,
      "id" | "policy_code" | "created_at" | "deleted_at" | "updated_at"
    >
  > & { updated_at: string & tags.Format<"date-time"> };

  // Update the policy
  const updated = await MyGlobal.prisma.storyfield_ai_system_policies.update({
    where: { id: policyId },
    data: updateFields,
  });

  // Return response; deleted_at is optional+nullable in DTO
  return {
    id: updated.id,
    policy_code: updated.policy_code,
    name: updated.name,
    description: updated.description,
    value: updated.value,
    type: updated.type,
    active: updated.active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    ...(updated.deleted_at !== null
      ? { deleted_at: toISOStringSafe(updated.deleted_at) }
      : {}),
  };
}
