import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Retrieve a specific Technical Project Manager (TPM) by their unique ID.
 *
 * This operation accesses the task_management_tpm table, which stores TPM user
 * information, including email, hashed password, name, creation date, update
 * date, and soft deletion status.
 *
 * Only authorized TPM users can perform this operation.
 *
 * @param props - The properties containing the authenticated TPM user and the
 *   target TPM user ID.
 * @param props.tpm - The authenticated TPM user payload.
 * @param props.id - The UUID of the TPM user to retrieve.
 * @returns The detailed TPM user data excluding sensitive password hash
 *   exposure.
 * @throws {Error} When the TPM user does not exist or has been soft deleted.
 */
export async function gettaskManagementTpmTaskManagementTpmsId(props: {
  tpm: TpmPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITaskManagementTpm> {
  const { tpm, id } = props;

  const tpmUser = await MyGlobal.prisma.task_management_tpm.findUniqueOrThrow({
    where: { id },
  });

  if (tpmUser.deleted_at !== null && tpmUser.deleted_at !== undefined) {
    throw new Error("TPM user not found");
  }

  return {
    id: tpmUser.id,
    email: tpmUser.email,
    password_hash: tpmUser.password_hash,
    name: tpmUser.name,
    created_at: toISOStringSafe(tpmUser.created_at),
    updated_at: toISOStringSafe(tpmUser.updated_at),
    deleted_at: tpmUser.deleted_at ? toISOStringSafe(tpmUser.deleted_at) : null,
  };
}
