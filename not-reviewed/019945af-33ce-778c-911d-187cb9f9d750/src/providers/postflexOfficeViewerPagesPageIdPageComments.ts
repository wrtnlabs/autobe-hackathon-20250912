import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";
import { ViewerPayload } from "../decorators/payload/ViewerPayload";

/**
 * Create a new comment on a specific FlexOffice UI page.
 *
 * Stores a comment authored by the viewer on the specified page. Returns the
 * newly created comment including all metadata.
 *
 * @param props - Object containing viewer info, pageId, and comment creation
 *   data
 * @param props.viewer - Authenticated viewer user performing the operation
 * @param props.pageId - UUID of the UI page to which the comment will be linked
 * @param props.body - Comment content including page_id, editor_id, and content
 * @returns Newly created comment object conforming to IFlexOfficePageComment
 * @throws {Error} If any unexpected error occurs during creation
 */
export async function postflexOfficeViewerPagesPageIdPageComments(props: {
  viewer: ViewerPayload;
  pageId: string & tags.Format<"uuid">;
  body: IFlexOfficePageComment.ICreate;
}): Promise<IFlexOfficePageComment> {
  const { viewer, pageId, body } = props;

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.flex_office_page_comments.create({
    data: {
      id: v4(),
      page_id: pageId,
      editor_id: viewer.id,
      content: body.content,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    page_id: created.page_id,
    editor_id: created.editor_id,
    content: created.content,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
