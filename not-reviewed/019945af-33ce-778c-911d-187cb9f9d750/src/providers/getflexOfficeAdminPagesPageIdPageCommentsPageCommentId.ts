import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information of a single page comment identified by
 * pageCommentId within a specified FlexOffice UI page identified by pageId.
 *
 * This operation requires admin authorization. It returns full comment details
 * including content, editor ID, timestamps, and deletion status.
 *
 * @param props - Object containing admin payload, page ID, and page comment ID
 * @param props.admin - The authenticated admin user making the request
 * @param props.pageId - UUID of the FlexOffice UI page
 * @param props.pageCommentId - UUID of the page comment to retrieve
 * @returns The detailed page comment entity matching the identifiers
 * @throws {Error} Throws if admin is unauthorized or the page comment does not
 *   exist
 */
export async function getflexOfficeAdminPagesPageIdPageCommentsPageCommentId(props: {
  admin: AdminPayload;
  pageId: string & tags.Format<"uuid">;
  pageCommentId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficePageComment> {
  const { admin, pageId, pageCommentId } = props;

  // Verify admin authorization by checking active admin with no deleted_at
  const foundAdmin = await MyGlobal.prisma.flex_office_admins.findFirst({
    where: {
      id: admin.id,
      deleted_at: null,
    },
  });

  if (!foundAdmin) {
    throw new Error("Unauthorized");
  }

  // Retrieve the requested page comment
  const comment =
    await MyGlobal.prisma.flex_office_page_comments.findFirstOrThrow({
      where: {
        id: pageCommentId,
        page_id: pageId,
      },
    });

  // Map and convert date fields appropriately
  return {
    id: comment.id,
    page_id: comment.page_id,
    editor_id: comment.editor_id,
    content: comment.content,
    created_at: toISOStringSafe(comment.created_at),
    updated_at: toISOStringSafe(comment.updated_at),
    deleted_at: comment.deleted_at
      ? toISOStringSafe(comment.deleted_at)
      : comment.deleted_at,
  };
}
