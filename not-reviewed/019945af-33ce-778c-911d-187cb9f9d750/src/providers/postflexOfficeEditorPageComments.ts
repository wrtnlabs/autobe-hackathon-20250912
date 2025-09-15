import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageComment";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Create a new comment on a FlexOffice UI page.
 *
 * This operation allows authorized editors to add textual annotations
 * associated with UI pages for collaboration and editorial workflows.
 *
 * Authorization checks ensure the editor and page are active and accessible.
 *
 * @param props - Object containing editor info and comment payload
 * @param props.editor - Authenticated editor payload
 * @param props.body - Comment creation data including page_id, editor_id, and
 *   content
 * @returns The newly created FlexOffice page comment with all timestamps
 * @throws {Error} When editor or page is not found or inactive
 */
export async function postflexOfficeEditorPageComments(props: {
  editor: EditorPayload;
  body: IFlexOfficePageComment.ICreate;
}): Promise<IFlexOfficePageComment> {
  const { editor, body } = props;

  // Verify the editor exists and is active
  const foundEditor = await MyGlobal.prisma.flex_office_editors.findUnique({
    where: { id: body.editor_id },
  });
  if (!foundEditor || foundEditor.deleted_at !== null) {
    throw new Error("Editor not found or inactive");
  }

  // Verify the page exists and is active
  const foundPage = await MyGlobal.prisma.flex_office_pages.findUnique({
    where: { id: body.page_id },
  });
  if (!foundPage || foundPage.deleted_at !== null) {
    throw new Error("Page not found or inactive");
  }

  // Generate current ISO timestamp for created_at and updated_at
  const now = toISOStringSafe(new Date());

  // Create the new comment record
  const created = await MyGlobal.prisma.flex_office_page_comments.create({
    data: {
      id: v4(),
      page_id: body.page_id,
      editor_id: body.editor_id,
      content: body.content,
      created_at: now,
      updated_at: now,
    },
  });

  // Return the created comment with properly typed dates
  return {
    id: created.id as string & tags.Format<"uuid">,
    page_id: created.page_id as string & tags.Format<"uuid">,
    editor_id: created.editor_id as string & tags.Format<"uuid">,
    content: created.content,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
  };
}
