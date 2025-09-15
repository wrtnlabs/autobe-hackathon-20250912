import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Delete a specific page comment from a UI page (admin only).
 *
 * Permanently remove a page comment identified by `pageCommentId` under page
 * `pageId`. This operation performs a hard delete; deleted comments cannot be
 * recovered. Only users with the admin role can perform this operation.
 *
 * @param props - Object containing admin auth payload and identifiers
 * @param props.admin - Authenticated admin performing the operation
 * @param props.pageId - UUID of the UI page that owns the comment
 * @param props.pageCommentId - UUID of the comment to delete
 * @returns Void
 * @throws {Error} Throws if the comment does not exist or does not belong to
 *   the page
 */
export async function deleteflexOfficeAdminPagesPageIdPageCommentsPageCommentId(props: {
  admin: AdminPayload;
  pageId: string & tags.Format<"uuid">;
  pageCommentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, pageId, pageCommentId } = props;

  // Validate comment existence and association with page
  await MyGlobal.prisma.flex_office_page_comments.findFirstOrThrow({
    where: {
      id: pageCommentId,
      page_id: pageId,
    },
  });

  // Perform hard delete
  await MyGlobal.prisma.flex_office_page_comments.delete({
    where: {
      id: pageCommentId,
    },
  });
}
