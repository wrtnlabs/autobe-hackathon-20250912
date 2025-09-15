import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Update a Technical Project Manager user by their ID.
 *
 * This function updates the TPM specified by the `id` parameter using the
 * provided properties in `body`. Only supplied fields are updated; other fields
 * remain unchanged. The updated TPM user record is returned with all timestamps
 * in ISO string format.
 *
 * Authorization is assured via the `tpm` payload and `id`.
 *
 * @param props - Object containing authentication payload, TPM id, and update
 *   data.
 * @param props.tpm - The authenticated TPM user payload.
 * @param props.id - The UUID of the TPM user to update.
 * @param props.body - The partial update data for the TPM user.
 * @returns The updated TPM user record.
 * @throws Error if the TPM user with given ID does not exist.
 */
export async function puttaskManagementTpmTaskManagementTpmsId(props: {
  tpm: TpmPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementTpm.IUpdate;
}): Promise<ITaskManagementTpm> {
  const { tpm, id, body } = props;

  // Ensure the TPM exists
  await MyGlobal.prisma.task_management_tpm.findUniqueOrThrow({
    where: { id },
  });

  // Perform the update with only provided fields
  const updated = await MyGlobal.prisma.task_management_tpm.update({
    where: { id },
    data: {
      email: body.email ?? undefined,
      password_hash: body.password_hash ?? undefined,
      name: body.name ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return updated TPM user with date fields converted
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
