import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Creates a new editor comment associated with a specific FlexOffice UI page.
 *
 * This operation requires an authenticated admin user. It stores the comment
 * with page and editor association, content, and timestamps.
 *
 * @param props - Operation parameters
 * @param props.admin - The admin performing the operation
 * @param props.pageId - UUID of the FlexOffice UI page
 * @param props.body - Comment creation data
 * @returns The created comment record
 * @throws Propagates any unexpected error from database operations
 */
export async function postflexOfficeAdminPagesPageIdPageComments(props: {
  admin: AdminPayload;
  pageId: string & tags.Format<"uuid">;
  body: IFlexOfficePageComment.ICreate;
}): Promise<IFlexOfficePageComment> {
  const { admin, pageId, body } = props;

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.flex_office_page_comments.create({
    data: {
      id: v4(),
      page_id: pageId,
      editor_id: body.editor_id,
      content: body.content,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    page_id: created.page_id,
    editor_id: created.editor_id,
    content: created.content,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}
