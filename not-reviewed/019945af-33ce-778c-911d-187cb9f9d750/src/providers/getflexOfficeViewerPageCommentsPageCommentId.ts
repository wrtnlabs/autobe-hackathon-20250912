import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";
import { ViewerPayload } from "../decorators/payload/ViewerPayload";

/**
 * Retrieve detailed FlexOffice page comment information by ID for viewer.
 *
 * This function fetches a single page comment specified by its unique ID from
 * the prisma flex_office_page_comments table, enforcing that the comment is not
 * soft deleted (deleted_at is null), thus ensuring only active comments are
 * retrievable.
 *
 * The return includes all comment fields including content, editor and page
 * IDs, timestamps with proper ISO string formatting. Authorization is assumed
 * to be handled by the viewer authentication middleware.
 *
 * @param props - Object containing viewer authentication info and target
 *   comment ID
 * @param props.viewer - Authenticated viewer making the request
 * @param props.pageCommentId - UUID of the page comment to retrieve
 * @returns The detailed page comment data conforming to IFlexOfficePageComment
 *   interface
 * @throws {Error} If the comment is not found or soft deleted
 */
export async function getflexOfficeViewerPageCommentsPageCommentId(props: {
  viewer: ViewerPayload;
  pageCommentId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficePageComment> {
  const { viewer, pageCommentId } = props;

  const comment =
    await MyGlobal.prisma.flex_office_page_comments.findUniqueOrThrow({
      where: {
        id: pageCommentId,
        deleted_at: null,
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
