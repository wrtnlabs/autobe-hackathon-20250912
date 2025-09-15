import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Retrieve details of a specific active page editor session by page ID and page
 * editor ID.
 *
 * This operation allows authorized editors to fetch comprehensive information
 * about their editing sessions for collaborative management purposes.
 *
 * @param props - Object containing the authenticated editor payload and
 *   identifiers
 * @param props.editor - The authenticated editor making the request
 * @param props.pageId - UUID of the UI page the editor session belongs to
 * @param props.pageEditorId - UUID of the page editor session to retrieve
 * @returns The detailed page editor session information conforming to
 *   IFlexOfficePageEditor
 * @throws {Error} When the session is not found or the editor is unauthorized
 *   to access it
 */
export async function getflexOfficeEditorPagesPageIdPageEditorsPageEditorId(props: {
  editor: EditorPayload;
  pageId: string & tags.Format<"uuid">;
  pageEditorId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficePageEditor> {
  const record =
    await MyGlobal.prisma.flex_office_page_editors.findFirstOrThrow({
      where: {
        id: props.pageEditorId,
        page_id: props.pageId,
      },
    });

  if (record.editor_id !== props.editor.id) {
    throw new Error(
      "Unauthorized access: You can only access your own editor session.",
    );
  }

  return {
    id: record.id,
    page_id: record.page_id,
    editor_id: record.editor_id,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
