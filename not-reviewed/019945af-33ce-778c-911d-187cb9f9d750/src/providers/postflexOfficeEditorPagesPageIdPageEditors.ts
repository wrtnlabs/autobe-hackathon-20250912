import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Create a new page editor session for collaborative editing on the specified
 * UI page.
 *
 * Ensures that each editor has at most one active session per page. Throws an
 * error if a session already exists.
 *
 * @param props - Object containing the authenticated editor, pageId, and the
 *   session creation data
 * @param props.editor - The authenticated editor performing the operation
 * @param props.pageId - UUID string identifying the UI page
 * @param props.body - Creation data including page_id and editor_id
 * @returns The newly created page editor session details conforming to
 *   IFlexOfficePageEditor
 * @throws {Error} When pageId URL parameter does not match body.page_id
 * @throws {Error} If an active session already exists for the page and editor
 */
export async function postflexOfficeEditorPagesPageIdPageEditors(props: {
  editor: EditorPayload;
  pageId: string & tags.Format<"uuid">;
  body: IFlexOfficePageEditor.ICreate;
}): Promise<IFlexOfficePageEditor> {
  const { editor, pageId, body } = props;

  if (pageId !== body.page_id) {
    throw new Error("Parameter pageId does not match body.page_id");
  }

  const existing = await MyGlobal.prisma.flex_office_page_editors.findFirst({
    where: {
      page_id: body.page_id,
      editor_id: body.editor_id,
      deleted_at: null,
    },
  });
  if (existing !== null) {
    throw new Error(
      "An active editor session already exists for this page and editor",
    );
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.flex_office_page_editors.create({
    data: {
      id: v4(),
      page_id: body.page_id,
      editor_id: body.editor_id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  typia.assertGuard<string & tags.Format<"uuid">>(created.id);
  typia.assertGuard<string & tags.Format<"uuid">>(created.page_id);
  typia.assertGuard<string & tags.Format<"uuid">>(created.editor_id);
  typia.assertGuard<string & tags.Format<"date-time">>(created.created_at);
  typia.assertGuard<string & tags.Format<"date-time">>(created.updated_at);

  return {
    id: created.id,
    page_id: created.page_id,
    editor_id: created.editor_id,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: null,
  };
}
