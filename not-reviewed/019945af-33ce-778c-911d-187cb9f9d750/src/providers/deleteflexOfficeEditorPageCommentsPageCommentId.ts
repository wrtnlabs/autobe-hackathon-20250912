import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Deletes a FlexOffice page comment by its unique ID.
 *
 * This operation permanently removes the page comment identified by
 * `pageCommentId` from the flex_office_page_comments table. It is intended for
 * authorized editors who need to delete inappropriate or obsolete comments as
 * part of collaboration workflows.
 *
 * The function will throw an error if the comment does not exist.
 *
 * @param props - Object containing authorization and target comment ID
 * @param props.editor - Authenticated editor payload
 * @param props.pageCommentId - UUID string identifying the page comment to
 *   delete
 * @returns Promise<void> - No content returned
 * @throws {Error} Throws if the comment with given ID does not exist
 */
export async function deleteflexOfficeEditorPageCommentsPageCommentId(props: {
  editor: EditorPayload;
  pageCommentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { editor, pageCommentId } = props;

  // Verify the page comment exists, throws if not found
  await MyGlobal.prisma.flex_office_page_comments.findUniqueOrThrow({
    where: { id: pageCommentId },
  });

  // Perform a hard delete of the page comment
  await MyGlobal.prisma.flex_office_page_comments.delete({
    where: { id: pageCommentId },
  });
}
