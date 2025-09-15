import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Update an existing QA user account identified by UUID.
 *
 * This function updates the specified fields (email, password_hash, name,
 * updated_at) of a QA user in the database. It ensures the user exists before
 * updating and returns the fully updated user entity.
 *
 * Authorization for this operation should be handled externally, ensuring only
 * PMO users can invoke this function.
 *
 * @param props - Object containing PMO authentication payload, target user ID,
 *   and update fields.
 * @param props.pmo - Authenticated PMO user payload.
 * @param props.id - UUID of the QA user to be updated.
 * @param props.body - Partial update fields for the QA user.
 * @returns The updated QA user entity.
 * @throws {Error} If the QA user with specified ID does not exist.
 */
export async function puttaskManagementPmoTaskManagementQasId(props: {
  pmo: PmoPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementQa.IUpdate;
}): Promise<ITaskManagementQa> {
  const { pmo, id, body } = props;

  // Authorization should be enforced by framework/decorator

  // Verify existence of QA user
  await MyGlobal.prisma.task_management_qa.findUniqueOrThrow({ where: { id } });

  const now = toISOStringSafe(new Date());

  // Update with provided fields; skip undefined
  const updated = await MyGlobal.prisma.task_management_qa.update({
    where: { id },
    data: {
      email: body.email ?? undefined,
      password_hash: body.password_hash ?? undefined,
      name: body.name ?? undefined,
      updated_at: body.updated_at ? toISOStringSafe(body.updated_at) : now,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    name: updated.name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
