import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementDeveloper } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDeveloper";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Update developer information by ID
 *
 * This operation updates an existing developer user in the database by its
 * unique ID. It allows updating the email, password_hash, and name fields. The
 * updated_at timestamp is automatically managed and set to the current time.
 * Soft deleted records (where deleted_at is set) cannot be updated.
 *
 * @param props - Object containing the PM payload, developer ID, and update
 *   body.
 * @param props.pm - The authenticated PM user performing the update.
 * @param props.id - The UUID of the developer to update.
 * @param props.body - Partial update data for the developer.
 * @returns The updated developer user data.
 * @throws {Error} When the developer does not exist or is soft deleted.
 * @throws {Error} When a unique constraint (e.g., duplicate email) violation
 *   occurs.
 */
export async function puttaskManagementPmTaskManagementDevelopersId(props: {
  pm: PmPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementDeveloper.IUpdate;
}): Promise<ITaskManagementDeveloper> {
  const { pm, id, body } = props;

  // Verify the developer exists and is not soft deleted
  await MyGlobal.prisma.task_management_developer.findFirstOrThrow({
    where: {
      id,
      deleted_at: null,
    },
  });

  // Prepare update data, skipping undefined fields
  const data: Partial<ITaskManagementDeveloper.IUpdate> = {};

  if (body.email !== undefined) data.email = body.email;
  if (body.password_hash !== undefined) data.password_hash = body.password_hash;
  if (body.name !== undefined) data.name = body.name;
  if (body.deleted_at !== undefined) data.deleted_at = body.deleted_at;

  data.updated_at = toISOStringSafe(new Date());

  // Perform update
  const updated = await MyGlobal.prisma.task_management_developer.update({
    where: { id },
    data,
  });

  // Return updated developer, converting dates properly
  return {
    id: updated.id as string & tags.Format<"uuid">,
    email: updated.email,
    password_hash: updated.password_hash,
    name: updated.name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ?? null,
  };
}
