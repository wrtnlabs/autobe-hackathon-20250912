import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IStoryfieldAiSystemPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemPolicy";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new system policy record (storyfield_ai_system_policies table).
 *
 * This operation enables authorized system administrators to create and
 * register a new global system policy in the service. Each policy defines a
 * business, technical, or compliance rule or toggle, and is instantly effective
 * and auditable after creation. The policy code must be unique. Audit fields
 * (created_at, updated_at) and ID are set at creation; no Date is ever returned
 * or stored, only ISO 8601 date-time branded strings. Fully consistent with
 * Prisma schema and IStoryfieldAiSystemPolicy type. Authorization is enforced
 * upstream (systemAdmin param). Throws an error if policy_code is not unique.
 *
 * @param props - Request props: systemAdmin JWT payload (authorization) and
 *   body (policy details)
 * @returns The newly registered IStoryfieldAiSystemPolicy object
 * @throws {Error} If a policy with the same policy_code already exists or on DB
 *   error
 */
export async function poststoryfieldAiSystemAdminSystemPolicies(props: {
  systemAdmin: SystemadminPayload;
  body: IStoryfieldAiSystemPolicy.ICreate;
}): Promise<IStoryfieldAiSystemPolicy> {
  const { body } = props;

  // Enforce uniqueness of policy_code (business logic / unique index)
  const duplicate =
    await MyGlobal.prisma.storyfield_ai_system_policies.findFirst({
      where: { policy_code: body.policy_code },
    });
  if (duplicate) {
    throw new Error(
      "A system policy with the given policy_code already exists.",
    );
  }

  // Prepare audit fields and PK
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const newId: string & tags.Format<"uuid"> = v4();

  // Insert new policy record
  const created = await MyGlobal.prisma.storyfield_ai_system_policies.create({
    data: {
      id: newId,
      policy_code: body.policy_code,
      name: body.name,
      description: body.description,
      value: body.value,
      type: body.type,
      active: body.active,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Normalize all fields, branding all date/datetime as string & tags.Format<'date-time'>
  return {
    id: created.id,
    policy_code: created.policy_code,
    name: created.name,
    description: created.description,
    value: created.value,
    type: created.type,
    active: created.active,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === undefined
        ? null
        : created.deleted_at === null
          ? null
          : toISOStringSafe(created.deleted_at),
  };
}
