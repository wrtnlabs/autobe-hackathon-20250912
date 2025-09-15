import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Create a new Project Management Officer (PMO) user.
 *
 * This operation creates a PMO user in the system with provided email, hashed
 * password, and name. Only authorized users with 'pmo' role can perform this
 * operation.
 *
 * @param props - Object containing the pmo auth payload and the creation body
 * @param props.pmo - Authenticated PMO user payload
 * @param props.body - PMO user creation data conforming to
 *   ITaskManagementPmo.ICreate
 * @returns The newly created PMO user entity
 * @throws {Error} Throws if unique email constraint violated or other DB errors
 */
export async function posttaskManagementPmoTaskManagementPmos(props: {
  pmo: PmoPayload;
  body: ITaskManagementPmo.ICreate;
}): Promise<ITaskManagementPmo> {
  const { pmo, body } = props;

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.task_management_pmo.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
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
    password_hash: created.password_hash,
    name: created.name,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? null,
  };
}
