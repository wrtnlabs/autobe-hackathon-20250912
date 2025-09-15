import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Updates an existing FlexOffice editor user.
 *
 * This operation updates editor details such as name, email, password hash, and
 * deleted_at status. It requires administrative privileges.
 *
 * @param props - Object containing admin authorization, editorId, and update
 *   body
 * @param props.admin - The authenticated admin performing the update
 * @param props.editorId - Unique UUID of the editor to update
 * @param props.body - Partial editor update data conforming to
 *   IFlexOfficeEditor.IUpdate
 * @returns The updated IFlexOfficeEditor record
 * @throws {Error} If the editor with given editorId does not exist
 */
export async function putflexOfficeAdminEditorsEditorId(props: {
  admin: AdminPayload;
  editorId: string & tags.Format<"uuid">;
  body: IFlexOfficeEditor.IUpdate;
}): Promise<IFlexOfficeEditor> {
  const { admin, editorId, body } = props;

  // Existence check with error throwing
  const editor = await MyGlobal.prisma.flex_office_editors.findUniqueOrThrow({
    where: { id: editorId },
  });

  // Current ISO timestamp for updated_at
  const now = toISOStringSafe(new Date());

  // Update editable fields; skip undefined fields
  const updated = await MyGlobal.prisma.flex_office_editors.update({
    where: { id: editorId },
    data: {
      name: body.name ?? undefined,
      email: body.email ?? undefined,
      password_hash: body.password_hash ?? undefined,
      deleted_at: body.deleted_at ?? undefined,
      updated_at: now,
    },
  });

  // Return updated editor with dates converted
  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
