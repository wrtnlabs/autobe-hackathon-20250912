import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Update a page editor session by ID
 *
 * Updates an existing editor session in the FlexOffice collaboration system.
 * Only the owning editor can modify the session.
 *
 * @param props - Object containing the authenticated editor, session ID, and
 *   update payload
 * @param props.editor - The authenticated editor making the request
 * @param props.pageEditorId - Unique UUID of the page editor session to update
 * @param props.body - Update payload matching IFlexOfficePageEditor.IUpdate
 *   interface
 * @returns The updated page editor session object with all fields
 * @throws {Error} If the session does not exist
 * @throws {Error} If the authenticated editor is not authorized to update this
 *   session
 */
export async function putflexOfficeEditorPageEditorsPageEditorId(props: {
  editor: EditorPayload;
  pageEditorId: string & tags.Format<"uuid">;
  body: IFlexOfficePageEditor.IUpdate;
}): Promise<IFlexOfficePageEditor> {
  const { editor, pageEditorId, body } = props;

  const session =
    await MyGlobal.prisma.flex_office_page_editors.findUniqueOrThrow({
      where: { id: pageEditorId },
    });

  if (session.editor_id !== editor.id) {
    throw new Error(
      "Unauthorized: You can only update your own editor session",
    );
  }

  const updated = await MyGlobal.prisma.flex_office_page_editors.update({
    where: { id: pageEditorId },
    data: {
      page_id: body.page_id ?? undefined,
      editor_id: body.editor_id ?? undefined,
      deleted_at: body.deleted_at ?? undefined,
    },
  });

  return {
    id: updated.id,
    page_id: updated.page_id,
    editor_id: updated.editor_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ?? null,
  };
}
