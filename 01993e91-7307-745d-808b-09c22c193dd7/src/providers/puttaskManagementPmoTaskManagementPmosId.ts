import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Update a PMO user by ID
 *
 * This operation updates an existing Project Management Officer (PMO) user
 * record in the database. Only authorized PMO users can perform this update.
 * The update applies only to the fields provided in the request body.
 * Soft-deleted users cannot be updated.
 *
 * @param props - Object containing pmo authentication payload, target user id,
 *   and update data
 * @param props.pmo - The authenticated PMO user performing the update
 * @param props.id - Unique identifier of the PMO user to update
 * @param props.body - Partial update data for the PMO user
 * @returns The updated PMO user information
 * @throws {Error} When the PMO user to update is soft-deleted or does not exist
 */
export async function puttaskManagementPmoTaskManagementPmosId(props: {
  pmo: PmoPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementPmo.IUpdate;
}): Promise<ITaskManagementPmo> {
  const { pmo, id, body } = props;

  // Ensure the user exists and is not soft deleted
  const existing = await MyGlobal.prisma.task_management_pmo.findUniqueOrThrow({
    where: { id },
  });

  if (existing.deleted_at !== null && existing.deleted_at !== undefined) {
    throw new Error("Cannot update a soft-deleted PMO user");
  }

  // Prepare updated fields
  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.task_management_pmo.update({
    where: { id },
    data: {
      email: body.email ?? undefined,
      password_hash: body.password_hash ?? undefined,
      name: body.name ?? undefined,
      deleted_at: body.deleted_at === undefined ? undefined : body.deleted_at,
      updated_at: now,
    },
  });

  // Return the updated user with converted date fields
  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    name: updated.name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ?? null,
  };
}
