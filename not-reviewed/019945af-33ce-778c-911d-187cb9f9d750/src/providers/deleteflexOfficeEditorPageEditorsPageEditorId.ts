import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Delete a page editor session by its unique ID.
 *
 * This operation removes an editor session from a UI page, effectively ending
 * the editor's editing concurrency slot.
 *
 * Authorization is required and enforced; only the editor who owns the session
 * may delete it.
 *
 * @param props - Contains the authenticated editor and the unique pageEditorId
 *   to delete.
 * @param props.editor - The authenticated editor performing the deletion.
 * @param props.pageEditorId - UUID of the page editor session to delete.
 * @returns Void
 * @throws {Error} When the session is not found or the editor is unauthorized.
 */
export async function deleteflexOfficeEditorPageEditorsPageEditorId(props: {
  editor: EditorPayload;
  pageEditorId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { editor, pageEditorId } = props;

  const session =
    await MyGlobal.prisma.flex_office_page_editors.findUniqueOrThrow({
      where: { id: pageEditorId },
    });

  if (session.editor_id !== editor.id) {
    throw new Error(
      "Unauthorized: You can only delete your own page editor sessions",
    );
  }

  await MyGlobal.prisma.flex_office_page_editors.delete({
    where: { id: pageEditorId },
  });
}
