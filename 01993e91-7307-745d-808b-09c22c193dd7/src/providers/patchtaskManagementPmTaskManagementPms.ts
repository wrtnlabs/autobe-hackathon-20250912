import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Update a Project Manager's details including email, name, and password.
 *
 * This function requires authentication as a Project Manager (pm role) and
 * updates the task_management_pm entity with the provided id. It hashes the
 * provided plain password before storing it securely.
 *
 * @param props - The function parameters.
 * @param props.pm - The authenticated Project Manager payload.
 * @param props.id - The UUID of the Project Manager to update.
 * @param props.body - The new data to update the Project Manager with.
 * @returns The updated Project Manager record with all fields.
 * @throws {Error} If the Project Manager with the specified id does not exist.
 */
export async function patchtaskManagementPmTaskManagementPms(props: {
  pm: PmPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementPm.ICreate;
}): Promise<ITaskManagementPm> {
  const { pm, id, body } = props;

  const existing = await MyGlobal.prisma.task_management_pm.findUnique({
    where: { id },
  });
  if (!existing) throw new Error("Project Manager not found");

  const password_hash = await MyGlobal.password.hash(body.password);

  const updated_at = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.task_management_pm.update({
    where: { id },
    data: {
      email: body.email,
      password_hash: password_hash,
      name: body.name,
      updated_at,
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
