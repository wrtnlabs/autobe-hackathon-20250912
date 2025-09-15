import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Update developer information by ID.
 *
 * Updates an existing developer user account in the task_management_developer
 * table by its unique id. Allows updating email, password_hash, and name. The
 * system automatically updates the updated_at timestamp. Soft deleted
 * developers (where deleted_at is set) cannot be updated.
 *
 * @param props - Object containing the PMO user authentication, developer id,
 *   and update data.
 * @param props.pmo - Authenticated PMO user's payload for authorization.
 * @param props.id - Unique identifier of the developer to update.
 * @param props.body - Update data containing email, password_hash, and/or name.
 * @returns The updated developer user details with all fields.
 * @throws {Error} When the developer with given id is not found or is soft
 *   deleted.
 * @throws {Error} When update violates unique constraints such as duplicate
 *   email.
 */
export async function puttaskManagementPmoTaskManagementDevelopersId(props: {
  pmo: PmoPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementDeveloper.IUpdate;
}): Promise<ITaskManagementDeveloper> {
  const { pmo, id, body } = props;

  // Find existing developer excluding soft deleted
  const existingDeveloper =
    await MyGlobal.prisma.task_management_developer.findUniqueOrThrow({
      where: { id },
    });

  if (existingDeveloper.deleted_at !== null) {
    throw new Error(
      `Developer with id ${id} is soft deleted and cannot be updated.`,
    );
  }

  // Perform update
  const updated = await MyGlobal.prisma.task_management_developer.update({
    where: { id },
    data: {
      email: body.email ?? undefined,
      password_hash: body.password_hash ?? undefined,
      name: body.name ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return updated developer with proper date string formatting
  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    name: updated.name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ?? undefined,
  };
}
