import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComments";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update an existing page comment associated with a UI page.
 *
 * This operation allows an admin user to update the content, updated_at, and
 * deleted_at fields of a specific comment identified by pageCommentId under the
 * specified page.
 *
 * @param props - Object containing admin payload, page UUIDs, and update data.
 * @param props.admin - Authenticated admin user payload.
 * @param props.pageId - UUID of the UI page the comment belongs to.
 * @param props.pageCommentId - UUID of the comment to update.
 * @param props.body - Partial update data for the comment.
 * @returns The fully updated comment record with proper date conversions.
 * @throws {Error} If the comment does not exist or is soft-deleted.
 */
export async function putflexOfficeAdminPagesPageIdPageCommentsPageCommentId(props: {
  admin: AdminPayload;
  pageId: string & tags.Format<"uuid">;
  pageCommentId: string & tags.Format<"uuid">;
  body: IFlexOfficePageComments.IUpdate;
}): Promise<IFlexOfficePageComments> {
  const { admin, pageId, pageCommentId, body } = props;

  // Fetch existing active comment
  const existing =
    await MyGlobal.prisma.flex_office_page_comments.findFirstOrThrow({
      where: {
        id: pageCommentId,
        page_id: pageId,
        deleted_at: null,
      },
    });

  // Prepare update data object applying null/undefined correctly
  const dataToUpdate = {
    ...(body.content !== undefined && { content: body.content }),
    ...(body.updated_at !== undefined
      ? { updated_at: body.updated_at === null ? null : body.updated_at }
      : {}),
    ...(body.deleted_at !== undefined
      ? { deleted_at: body.deleted_at === null ? null : body.deleted_at }
      : {}),
  };

  // Perform update
  const updated = await MyGlobal.prisma.flex_office_page_comments.update({
    where: { id: pageCommentId },
    data: dataToUpdate,
  });

  // Return updated comment with dates converted to string format
  return {
    id: updated.id,
    page_id: updated.page_id,
    editor_id: updated.editor_id,
    content: updated.content,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: updated.updated_at ? toISOStringSafe(updated.updated_at) : null,
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
