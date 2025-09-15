import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Delete a specific page comment from a UI page.
 *
 * This operation permanently deletes the comment with the given pageCommentId
 * under the UI page identified by pageId.
 *
 * Only authorized editors are allowed to perform this action.
 *
 * @param props - Object containing editor payload and identifiers
 * @param props.editor - Authenticated editor performing the action
 * @param props.pageId - The UUID of the UI page containing the comment
 * @param props.pageCommentId - The UUID of the comment to delete
 * @throws {Error} If the comment is not found or already deleted
 */
export async function deleteflexOfficeEditorPagesPageIdPageCommentsPageCommentId(props: {
  editor: EditorPayload;
  pageId: string & tags.Format<"uuid">;
  pageCommentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { editor, pageId, pageCommentId } = props;

  // Verify that the comment exists and is not soft deleted
  const comment = await MyGlobal.prisma.flex_office_page_comments.findFirst({
    where: {
      id: pageCommentId,
      page_id: pageId,
      deleted_at: null,
    },
  });

  if (!comment) {
    throw new Error("Page comment not found or already deleted.");
  }

  // Hard delete the comment by primary key
  await MyGlobal.prisma.flex_office_page_comments.delete({
    where: {
      id: pageCommentId,
    },
  });
}
