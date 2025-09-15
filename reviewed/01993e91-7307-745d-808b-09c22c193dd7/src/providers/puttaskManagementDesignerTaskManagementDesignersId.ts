import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementDesigner } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementDesigner";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Update a designer user identified by unique ID.
 *
 * This operation allows modification of email, password hash, name, updated
 * timestamp, and soft delete timestamp. Soft-deleted records (deleted_at not
 * null) cannot be updated.
 *
 * @param props - Object containing the authenticated designer, the target id,
 *   and the update body.
 * @returns The updated designer user object.
 * @throws {Error} If the designer does not exist or is soft-deleted.
 */
export async function puttaskManagementDesignerTaskManagementDesignersId(props: {
  designer: DesignerPayload;
  id: string & tags.Format<"uuid">;
  body: ITaskManagementDesigner.IUpdate;
}): Promise<ITaskManagementDesigner> {
  const { designer, id, body } = props;

  // Check that the designer exists and is not deleted
  const existing = await MyGlobal.prisma.task_management_designer.findFirst({
    where: { id, deleted_at: null },
  });
  if (!existing) {
    throw new Error(`Designer with id ${id} not found or is deleted.`);
  }

  // Update designer with optional fields
  const updated = await MyGlobal.prisma.task_management_designer.update({
    where: { id },
    data: {
      email: body.email ?? undefined,
      password_hash: body.password_hash ?? undefined,
      name: body.name ?? undefined,
      updated_at:
        body.updated_at === null
          ? undefined
          : body.updated_at
            ? toISOStringSafe(body.updated_at)
            : undefined,
      deleted_at:
        body.deleted_at === null
          ? null
          : body.deleted_at
            ? toISOStringSafe(body.deleted_at)
            : undefined,
    },
  });

  // Return updated designer with converted date fields
  return {
    id: updated.id,
    email: updated.email,
    password_hash: updated.password_hash,
    name: updated.name,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: updated.updated_at
      ? toISOStringSafe(updated.updated_at)
      : undefined,
    deleted_at:
      updated.deleted_at === null
        ? null
        : updated.deleted_at
          ? toISOStringSafe(updated.deleted_at)
          : undefined,
  };
}
