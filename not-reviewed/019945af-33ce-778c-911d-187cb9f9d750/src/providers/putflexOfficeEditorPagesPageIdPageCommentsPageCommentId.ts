import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComments";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Update an existing comment on a UI page within the FlexOffice system.
 *
 * This operation modifies the content of the specified comment identified by
 * pageCommentId associated with the page pageId. Authorization is enforced by
 * verifying the editor's ownership of the comment.
 *
 * @param props - Object containing editor authentication, pageId,
 *   pageCommentId, and update body
 * @param props.editor - Authenticated editor payload
 * @param props.pageId - UUID of the UI page
 * @param props.pageCommentId - UUID of the page comment to update
 * @param props.body - Update payload containing content, updated_at, and
 *   deleted_at
 * @returns The updated page comment entity
 * @throws {Error} When the comment does not exist or does not belong to the
 *   editor
 * @throws {Error} When the content is an empty string
 */
export async function putflexOfficeEditorPagesPageIdPageCommentsPageCommentId(props: {
  editor: EditorPayload;
  pageId: string & tags.Format<"uuid">;
  pageCommentId: string & tags.Format<"uuid">;
  body: IFlexOfficePageComments.IUpdate;
}): Promise<IFlexOfficePageComments> {
  const { editor, pageId, pageCommentId, body } = props;

  // Fetch existing comment
  const existingComment =
    await MyGlobal.prisma.flex_office_page_comments.findUnique({
      where: { id: pageCommentId },
    });

  if (!existingComment) throw new Error(`Comment ${pageCommentId} not found`);

  // Verify the comment belongs to the specified page
  if (existingComment.page_id !== pageId)
    throw new Error(
      `Comment ${pageCommentId} does not belong to page ${pageId}`,
    );

  // Authorization check: only owner (editor) can update
  if (existingComment.editor_id !== editor.id)
    throw new Error("Unauthorized: Not the comment owner");

  // Content validation: content must not be an empty string if provided
  if (body.content !== undefined && body.content.trim() === "")
    throw new Error("Content cannot be empty string");

  // Perform update
  const updated = await MyGlobal.prisma.flex_office_page_comments.update({
    where: { id: pageCommentId },
    data: {
      content: body.content ?? undefined,
      updated_at: body.updated_at ?? toISOStringSafe(new Date()),
      deleted_at: body.deleted_at ?? undefined,
    },
  });

  // Return updated comment with proper date string formats
  return {
    id: updated.id as string & tags.Format<"uuid">,
    page_id: updated.page_id as string & tags.Format<"uuid">,
    editor_id: updated.editor_id as string & tags.Format<"uuid">,
    content: updated.content,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
