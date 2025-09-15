import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Update an existing Project Manager entity by ID.
 *
 * This operation updates the email, password hash, and name fields of the
 * specified PM user. It ensures that the PM user exists and is not soft deleted
 * before updating. The updated_at timestamp is set to the current time in ISO
 * 8601 format.
 *
 * @param props - Object containing the PM payload, target PM id, and update
 *   information.
 * @param props.pm - The authenticated PM user performing the update.
 * @param props.id - Unique identifier of the PM to update.
 * @param props.body - Partial data for updating the PM user including email,
 *   password_hash, and name.
 * @returns The updated Project Manager entity with all fields.
 * @throws {Error} Throws if the Project Manager does not exist or is soft
 *   deleted.
 */
export async function puttaskManagementPmTaskManagementPmsId(props: {
  pm: PmPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementPm.IUpdate;
}): Promise<ITaskManagementPm> {
  const { pm, id, body } = props;

  // Verify PM exists and not soft deleted
  const existingPm = await MyGlobal.prisma.task_management_pm.findUnique({
    where: { id },
  });

  if (!existingPm || existingPm.deleted_at !== null) {
    throw new Error("Project Manager not found or deleted");
  }

  const now = toISOStringSafe(new Date());

  // Update allowed fields from body
  const updatedPm = await MyGlobal.prisma.task_management_pm.update({
    where: { id },
    data: {
      email: body.email ?? undefined,
      password_hash: body.password_hash ?? undefined,
      name: body.name ?? undefined,
      updated_at: now,
    },
  });

  // Return with converted date strings
  return {
    id: updatedPm.id,
    email: updatedPm.email,
    password_hash: updatedPm.password_hash,
    name: updatedPm.name,
    created_at: toISOStringSafe(updatedPm.created_at),
    updated_at: toISOStringSafe(updatedPm.updated_at),
    deleted_at: updatedPm.deleted_at
      ? toISOStringSafe(updatedPm.deleted_at)
      : null,
  };
}
