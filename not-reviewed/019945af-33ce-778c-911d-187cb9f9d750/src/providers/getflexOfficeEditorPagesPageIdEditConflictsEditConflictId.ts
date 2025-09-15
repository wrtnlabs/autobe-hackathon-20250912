import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeEditConflict } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditConflict";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Retrieve detailed information of a specific edit conflict record by its ID
 * and associated page ID.
 *
 * This function fetches the edit conflict from the database, ensuring that the
 * requesting editor owns the record. It validates existence and authorization,
 * then returns the full conflict data including timestamps converted to ISO
 * 8601 date-time strings.
 *
 * @param props - Object containing the editor payload, page ID, and edit
 *   conflict ID
 * @param props.editor - The authenticated editor making the request
 * @param props.pageId - Unique identifier of the UI page
 * @param props.editConflictId - Unique identifier of the edit conflict record
 * @returns The edit conflict record matching the provided identifiers
 * @throws {Error} If the edit conflict record is not found or the editor is
 *   unauthorized
 */
export async function getflexOfficeEditorPagesPageIdEditConflictsEditConflictId(props: {
  editor: EditorPayload;
  pageId: string & tags.Format<"uuid">;
  editConflictId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeEditConflict> {
  const record = await MyGlobal.prisma.flex_office_edit_conflicts.findFirst({
    where: {
      id: props.editConflictId,
      page_id: props.pageId,
    },
  });

  if (record === null) {
    throw new Error(
      `Edit conflict not found for ID ${props.editConflictId} and page ID ${props.pageId}`,
    );
  }

  if (record.editor_id !== props.editor.id) {
    throw new Error(`Unauthorized: editor does not own this conflict record`);
  }

  return {
    id: record.id,
    page_id: record.page_id,
    editor_id: record.editor_id,
    conflict_data: record.conflict_data,
    created_at: toISOStringSafe(record.created_at),
  };
}
