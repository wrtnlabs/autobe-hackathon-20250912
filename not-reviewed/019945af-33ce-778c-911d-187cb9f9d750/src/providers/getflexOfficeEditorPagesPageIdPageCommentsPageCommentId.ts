import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Retrieve a single FlexOffice UI page comment by its unique ID within a
 * specified page.
 *
 * This function fetches the detailed information of the page comment identified
 * by pageCommentId under the page identified by pageId.
 *
 * @param props - Object containing the editor authentication payload and the
 *   identifiers for the page and the comment.
 * @param props.editor - Authenticated editor payload.
 * @param props.pageId - Unique identifier of the FlexOffice UI page.
 * @param props.pageCommentId - Unique identifier of the page comment to
 *   retrieve.
 * @returns Promise resolving to IFlexOfficePageComment containing full comment
 *   details.
 * @throws {Error} Throws if the page comment does not exist under the specified
 *   page.
 */
export async function getflexOfficeEditorPagesPageIdPageCommentsPageCommentId(props: {
  editor: EditorPayload;
  pageId: string & tags.Format<"uuid">;
  pageCommentId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficePageComment> {
  const { editor, pageId, pageCommentId } = props;

  const comment =
    await MyGlobal.prisma.flex_office_page_comments.findFirstOrThrow({
      where: {
        page_id: pageId,
        id: pageCommentId,
      },
    });

  return {
    id: comment.id,
    page_id: comment.page_id,
    editor_id: comment.editor_id,
    content: comment.content,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at
      ? toISOStringSafe(comment.deleted_at)
      : undefined,
  };
}
