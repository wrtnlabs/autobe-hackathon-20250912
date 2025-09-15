import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficePageEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficePageEditor";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Retrieve detailed page editor session information by ID.
 *
 * Fetches a single active or historic page editor session identified by its
 * unique ID. Includes references to the page and editor user, session
 * timestamps, and soft deletion status. Accessible only by authorized editors.
 *
 * @param props - The request properties including authorization and the unique
 *   session ID.
 * @param props.editor - The authenticated editor making the request.
 * @param props.pageEditorId - The UUID of the page editor session to retrieve.
 * @returns The full page editor session details.
 * @throws {Error} Throws if the page editor session with the specified ID does
 *   not exist.
 */
export async function getflexOfficeEditorPageEditorsPageEditorId(props: {
  editor: EditorPayload;
  pageEditorId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficePageEditor> {
  const { pageEditorId } = props;

  const record =
    await MyGlobal.prisma.flex_office_page_editors.findUniqueOrThrow({
      where: { id: pageEditorId },
    });

  return {
    id: record.id,
    page_id: record.page_id,
    editor_id: record.editor_id,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
