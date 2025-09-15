import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Create a new Technical Project Manager (TPM) user.
 *
 * This operation inserts a new TPM user record with unique email, hashed
 * password, and name. The created user's data (excluding password_hash) is
 * returned.
 *
 * @param props - Object containing TPM user creation data and authenticated TPM
 *   payload
 * @param props.tpm - Authenticated TPM user payload for access control
 * @param props.body - TPM user creation data including email, password hash,
 *   and name
 * @returns Newly created TPM user data excluding password hash
 * @throws {Error} When creation fails due to duplicate email or database errors
 */
export async function posttaskManagementTpmTaskManagementTpms(props: {
  tpm: TpmPayload;
  body: ITaskManagementTpm.ICreate;
}): Promise<ITaskManagementTpm> {
  const { body } = props;

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const newId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;

  const created = await MyGlobal.prisma.task_management_tpm.create({
    data: {
      id: newId,
      email: body.email,
      password_hash: body.password_hash,
      name: body.name,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    email: created.email,
    name: created.name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
