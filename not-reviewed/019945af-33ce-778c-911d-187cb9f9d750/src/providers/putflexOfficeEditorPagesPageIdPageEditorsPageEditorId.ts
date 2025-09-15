import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Update an existing page editor session by page ID and page editor ID.
 *
 * This endpoint allows an authorized editor to modify session metadata such as
 * timestamps or soft delete state on an active editor session for collaborative
 * editing.
 *
 * Authorization is enforced: only the owning editor can update their session.
 *
 * @param props - Object containing the editor identity, page ID, page editor
 *   ID, and update data
 * @returns The updated IFlexOfficePageEditor record with all fields properly
 *   typed
 * @throws {Error} If the target session does not exist or the user is
 *   unauthorized
 */
export async function putflexOfficeEditorPagesPageIdPageEditorsPageEditorId(props: {
  editor: EditorPayload;
  pageId: string & tags.Format<"uuid">;
  pageEditorId: string & tags.Format<"uuid">;
  body: IFlexOfficePageEditor.IUpdate;
}): Promise<IFlexOfficePageEditor> {
  const { editor, pageEditorId, pageId, body } = props;

  const editorSession =
    await MyGlobal.prisma.flex_office_page_editors.findFirstOrThrow({
      where: { id: pageEditorId, page_id: pageId },
    });

  if (editorSession.editor_id !== editor.id) {
    throw new Error(
      "Forbidden: Only the owning editor can update this session.",
    );
  }

  const updated = await MyGlobal.prisma.flex_office_page_editors.update({
    where: { id: pageEditorId },
    data: {
      page_id: body.page_id ?? undefined,
      editor_id: body.editor_id ?? undefined,
      deleted_at:
        body.deleted_at === null ? null : (body.deleted_at ?? undefined),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    page_id: updated.page_id,
    editor_id: updated.editor_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
