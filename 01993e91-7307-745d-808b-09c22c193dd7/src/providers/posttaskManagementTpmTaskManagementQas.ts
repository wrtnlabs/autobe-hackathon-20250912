import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Create a new Quality Assurance (QA) user account.
 *
 * This operation creates a new QA user in the taskManagement system. It
 * requires a `tpm` authenticated role and uses the provided user creation
 * information including unique email, hashed password, and user name.
 *
 * Upon success, the full QA user entity is returned with system-generated
 * timestamps.
 *
 * @param props - Request properties
 * @param props.tpm - The authenticated TPM user performing the creation
 * @param props.body - Data for creating the QA user including email, password
 *   hash, and name
 * @returns The newly created QA user entity with all fields populated
 * @throws {Error} When the email is already in use, or creation fails
 */
export async function posttaskManagementTpmTaskManagementQas(props: {
  tpm: TpmPayload;
  body: ITaskManagementQa.ICreate;
}): Promise<ITaskManagementQa> {
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.task_management_qa.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: props.body.password_hash,
      name: props.body.name,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    name: created.name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? undefined,
  };
}
