import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Soft-delete a page editor session identified by pageId and pageEditorId.
 *
 * Marks the session as deleted by setting the deleted_at timestamp. Only the
 * owning editor can delete their own session for authorization.
 *
 * @param props - Object containing the authenticated editor and IDs
 * @param props.editor - The authenticated editor payload
 * @param props.pageId - UUID of the page associated with the session
 * @param props.pageEditorId - UUID of the page editor session
 * @throws {Error} If the session is not found
 * @throws {Error} If the editor is not authorized to delete the session
 */
export async function deleteflexOfficeEditorPagesPageIdPageEditorsPageEditorId(props: {
  editor: EditorPayload;
  pageId: string & tags.Format<"uuid">;
  pageEditorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { editor, pageId, pageEditorId } = props;

  const session = await MyGlobal.prisma.flex_office_page_editors.findFirst({
    where: {
      id: pageEditorId,
      page_id: pageId,
      deleted_at: null,
    },
  });

  if (!session) {
    throw new Error("Page editor session not found");
  }

  if (session.editor_id !== editor.id) {
    throw new Error(
      "Unauthorized: You can only delete your own editor session",
    );
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.flex_office_page_editors.update({
    where: { id: pageEditorId },
    data: { deleted_at: now },
  });
}
