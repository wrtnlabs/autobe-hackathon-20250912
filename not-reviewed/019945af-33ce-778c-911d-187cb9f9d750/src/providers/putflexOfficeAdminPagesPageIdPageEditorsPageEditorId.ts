import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update page editor session details
 *
 * This function updates an existing page editor session identified by pageId
 * and pageEditorId. It modifies session metadata such as the page association,
 * editor reference, and soft delete state.
 *
 * Authorization: Only admins may perform this operation.
 *
 * @param props - The parameters including authenticated admin, path IDs, and
 *   update body
 * @returns The updated page editor session record
 * @throws {Error} When the specified page editor session does not exist
 */
export async function putflexOfficeAdminPagesPageIdPageEditorsPageEditorId(props: {
  admin: AdminPayload;
  pageId: string & tags.Format<"uuid">;
  pageEditorId: string & tags.Format<"uuid">;
  body: IFlexOfficePageEditor.IUpdate;
}): Promise<IFlexOfficePageEditor> {
  const { admin, pageId, pageEditorId, body } = props;

  // Current timestamp ISO string
  const now = toISOStringSafe(new Date());

  // Verify page editor session exists
  const existing = await MyGlobal.prisma.flex_office_page_editors.findFirst({
    where: { id: pageEditorId, page_id: pageId },
  });

  if (!existing) {
    throw new Error("Page editor session not found");
  }

  // Update record
  const updated = await MyGlobal.prisma.flex_office_page_editors.update({
    where: { id: pageEditorId },
    data: {
      page_id: body.page_id ?? undefined,
      editor_id: body.editor_id ?? undefined,
      deleted_at: body.deleted_at === undefined ? undefined : body.deleted_at,
      updated_at: now,
    },
  });

  // Return updated entity with proper date string conversions
  return {
    id: updated.id,
    page_id: updated.page_id,
    editor_id: updated.editor_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
