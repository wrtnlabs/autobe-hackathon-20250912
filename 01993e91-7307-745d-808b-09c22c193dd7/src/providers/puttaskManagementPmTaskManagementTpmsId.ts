import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Update TPM user by ID.
 *
 * This operation updates an existing Technical Project Manager (TPM) user by
 * their unique identifier. It accepts optional updates in email, password_hash,
 * and name, and updates the updated_at timestamp. The function throws if no
 * corresponding TPM user is found.
 *
 * @param props - The function props containing authorization info, TPM id, and
 *   update body
 * @param props.pm - The authenticated PM user performing the update
 * @param props.id - The UUID of the TPM user to update
 * @param props.body - The update payload for the TPM user
 * @returns The updated TPM user record
 * @throws {Error} Throws if TPM user with specified id does not exist
 */
export async function puttaskManagementPmTaskManagementTpmsId(props: {
  pm: PmPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementTpm.IUpdate;
}): Promise<ITaskManagementTpm> {
  const { pm, id, body } = props;

  // Verify TPM user exists or throw
  await MyGlobal.prisma.task_management_tpm.findUniqueOrThrow({
    where: { id },
  });

  // Update TPM user
  const updated = await MyGlobal.prisma.task_management_tpm.update({
    where: { id },
    data: {
      email: body.email ?? undefined,
      password_hash: body.password_hash ?? undefined,
      name: body.name ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return updated user with date fields converted
  return {
    id: updated.id as string & tags.Format<"uuid">,
    email: updated.email,
    password_hash: updated.password_hash,
    name: updated.name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
