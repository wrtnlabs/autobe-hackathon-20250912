import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Update an existing FlexOffice page comment by ID.
 *
 * This operation updates the content and editable properties of a page comment
 * identified by its unique ID. Authorization is enforced to ensure only the
 * owning editor can modify the comment.
 *
 * @param props - Object containing editor credentials, the page comment ID, and
 *   the update payload with fields content, updated_at, and deleted_at.
 * @returns The updated page comment details conforming to
 *   IFlexOfficePageComment.
 * @throws {Error} When the page comment does not belong to the authenticated
 *   editor.
 * @throws {Error} When the comment does not exist.
 */
export async function putflexOfficeEditorPageCommentsPageCommentId(props: {
  editor: EditorPayload;
  pageCommentId: string & tags.Format<"uuid">;
  body: IFlexOfficePageComment.IUpdate;
}): Promise<IFlexOfficePageComment> {
  const { editor, pageCommentId, body } = props;

  // Fetch the page comment, ensure it exists
  const comment =
    await MyGlobal.prisma.flex_office_page_comments.findUniqueOrThrow({
      where: { id: pageCommentId },
    });

  // Authorization: Only the owner editor can update
  if (comment.editor_id !== editor.id) {
    throw new Error("Unauthorized: You can only update your own comments");
  }

  // Prepare current timestamp as ISO string
  const now = toISOStringSafe(new Date());

  // Update the comment with provided fields
  const updated = await MyGlobal.prisma.flex_office_page_comments.update({
    where: { id: pageCommentId },
    data: {
      content: body.content ?? undefined,
      updated_at: now,
      deleted_at: body.deleted_at ?? undefined,
    },
  });

  // Return updated comment with correct date conversion
  return {
    id: updated.id,
    page_id: updated.page_id,
    editor_id: updated.editor_id,
    content: updated.content,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
