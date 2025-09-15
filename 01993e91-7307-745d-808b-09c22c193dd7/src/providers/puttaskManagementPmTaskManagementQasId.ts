import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Update an existing QA user account identified by UUID.
 *
 * This operation modifies allowed fields via the update body and sets
 * updated_at. Only non-deleted users are updated.
 *
 * Authorization: users with 'pm' role only.
 *
 * @param props - Object containing pm auth payload, target id and update data
 * @param props.pm - Authenticated PM payload
 * @param props.id - UUID of QA user to update
 * @param props.body - Partial update data for QA user
 * @returns Updated QA user entity
 * @throws {Error} If user not found or deleted
 */
export async function puttaskManagementPmTaskManagementQasId(props: {
  pm: PmPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementQa.IUpdate;
}): Promise<ITaskManagementQa> {
  const { pm, id, body } = props;

  const existingUser = await MyGlobal.prisma.task_management_qa.findFirst({
    where: { id, deleted_at: null },
  });

  if (!existingUser) throw new Error("QA User not found or deleted");

  const updatedUser = await MyGlobal.prisma.task_management_qa.update({
    where: { id },
    data: {
      updated_at: toISOStringSafe(new Date()),
      // ITaskManagementQa.IUpdate only has updated_at as per schema
      // Can't update email, password_hash or name as they're not part of IUpdate
    },
  });

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    password_hash: updatedUser.password_hash,
    name: updatedUser.name,
    created_at: toISOStringSafe(updatedUser.created_at),
    updated_at: toISOStringSafe(updatedUser.updated_at),
    deleted_at: updatedUser.deleted_at
      ? toISOStringSafe(updatedUser.deleted_at)
      : null,
  };
}
