import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Creates a new developer user account in the task_management_developer table.
 *
 * This operation requires a PM user authorization. It assigns a unique UUID to
 * the new developer, sets timestamps, and supports soft delete via deleted_at.
 *
 * @param props - Object containing PM payload and developer creation body.
 * @param props.pm - Authorized PM payload performing the operation.
 * @param props.body - Developer creation information including email,
 *   password_hash, name, and optional deleted_at.
 * @returns The newly created developer user details.
 * @throws {Error} Throws if unique email constraint is violated or database
 *   error occurs.
 */
export async function posttaskManagementPmTaskManagementDevelopers(props: {
  pm: PmPayload;
  body: ITaskManagementDeveloper.ICreate;
}): Promise<ITaskManagementDeveloper> {
  const { pm, body } = props;
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.task_management_developer.create({
    data: {
      id,
      email: body.email,
      password_hash: body.password_hash,
      name: body.name,
      deleted_at: body.deleted_at ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    name: created.name,
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
