import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ViewerPayload } from "../decorators/payload/ViewerPayload";

/**
 * Deletes a FlexOffice page comment by its unique identifier.
 *
 * This operation performs a hard delete on the `flex_office_page_comments`
 * table.
 *
 * Only the owner (editor) of the comment identified by the authenticated viewer
 * can delete it.
 *
 * @param props - Object containing viewer information and the ID of the page
 *   comment to delete
 * @param props.viewer - The authenticated viewer attempting to delete the
 *   comment
 * @param props.pageCommentId - The UUID of the page comment to be deleted
 * @throws {Error} When the page comment is not found
 * @throws {Error} When the authenticated viewer is not the owner of the comment
 */
export async function deleteflexOfficeViewerPageCommentsPageCommentId(props: {
  viewer: ViewerPayload;
  pageCommentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { viewer, pageCommentId } = props;

  const comment = await MyGlobal.prisma.flex_office_page_comments.findUnique({
    where: { id: pageCommentId },
  });

  if (!comment) {
    throw new Error("The page comment does not exist");
  }

  if (comment.editor_id !== viewer.id) {
    throw new Error("Unauthorized: You can only delete your own comments");
  }

  await MyGlobal.prisma.flex_office_page_comments.delete({
    where: { id: pageCommentId },
  });
}
