import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Create a new Technical Project Manager (TPM) user.
 *
 * This operation inserts a new TPM user into the database with unique email,
 * hashed password, name, and current timestamps for creation and update.
 * Password hash is stored securely but not returned.
 *
 * @param props - Object containing PMO authorization payload and TPM creation
 *   data
 * @param props.pmo - Authenticated Project Management Officer (PMO) payload
 * @param props.body - TPM user creation data including email, password hash,
 *   and name
 * @returns The created TPM user data without the password hash
 * @throws {Error} When creation fails due to duplicate email or other DB errors
 */
export async function posttaskManagementPmoTaskManagementTpms(props: {
  pmo: PmoPayload;
  body: ITaskManagementTpm.ICreate;
}): Promise<ITaskManagementTpm> {
  const { pmo, body } = props;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.task_management_tpm.create({
    data: {
      id: v4(),
      email: body.email,
      password_hash: body.password_hash,
      name: body.name,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    email: created.email,
    name: created.name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? null,
  };
}
