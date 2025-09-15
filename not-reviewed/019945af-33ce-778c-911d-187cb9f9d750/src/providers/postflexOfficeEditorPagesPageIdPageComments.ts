import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Create a new comment on a specific FlexOffice UI page.
 *
 * This endpoint creates an editor comment associated with a specific page,
 * storing content, editor identity, and timestamps.
 *
 * Authorization: Requires 'editor' role authentication.
 *
 * @param props - Properties including authenticated editor, pageId, and comment
 *   data
 * @param props.editor - Authenticated editor payload
 * @param props.pageId - UUID of the FlexOffice UI page
 * @param props.body - Comment creation data
 * @returns The newly created comment entity
 * @throws {Error} When content is empty
 * @throws {Error} When page does not exist or is deleted
 * @throws {Error} When editor does not exist or is deleted
 */
export async function postflexOfficeEditorPagesPageIdPageComments(props: {
  editor: EditorPayload;
  pageId: string & tags.Format<"uuid">;
  body: IFlexOfficePageComment.ICreate;
}): Promise<IFlexOfficePageComment> {
  const { editor, pageId, body } = props;

  if (body.content.trim() === "") {
    throw new Error("Comment content cannot be empty.");
  }

  const page = await MyGlobal.prisma.flex_office_pages.findFirst({
    where: { id: pageId, deleted_at: null },
  });
  if (!page) {
    throw new Error("Page does not exist or has been deleted.");
  }

  const editorRecord = await MyGlobal.prisma.flex_office_editors.findFirst({
    where: { id: editor.id, deleted_at: null },
  });
  if (!editorRecord) {
    throw new Error("Editor does not exist or has been deleted.");
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.flex_office_page_comments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      page_id: pageId,
      editor_id: editor.id,
      content: body.content,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    page_id: created.page_id as string & tags.Format<"uuid">,
    editor_id: created.editor_id as string & tags.Format<"uuid">,
    content: created.content,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}
