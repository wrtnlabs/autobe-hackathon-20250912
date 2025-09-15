import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";
import { ViewerPayload } from "../decorators/payload/ViewerPayload";

/**
 * Retrieve a single comment by its unique ID for a specific page.
 *
 * This function fetches a page comment from the flex_office_page_comments
 * table, identified by the given pageId and pageCommentId, excluding
 * soft-deleted comments. It returns detailed information including content,
 * editor ID, and timestamps.
 *
 * @param props - Object containing the authenticated viewer payload and
 *   identifiers.
 * @param props.viewer - Authenticated viewer user making the request.
 * @param props.pageId - UUID of the FlexOffice UI page.
 * @param props.pageCommentId - UUID of the page comment to retrieve.
 * @returns The detailed IFlexOfficePageComment entity.
 * @throws {Error} If no comment matching the criteria is found.
 */
export async function getflexOfficeViewerPagesPageIdPageCommentsPageCommentId(props: {
  viewer: ViewerPayload;
  pageId: string & tags.Format<"uuid">;
  pageCommentId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficePageComment> {
  const { viewer, pageId, pageCommentId } = props;

  const comment =
    await MyGlobal.prisma.flex_office_page_comments.findFirstOrThrow({
      where: {
        id: pageCommentId,
        page_id: pageId,
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
    deleted_at: comment.deleted_at ? toISOStringSafe(comment.deleted_at) : null,
  };
}
