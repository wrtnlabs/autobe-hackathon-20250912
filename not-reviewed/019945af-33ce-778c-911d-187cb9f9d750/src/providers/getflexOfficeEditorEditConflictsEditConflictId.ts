import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeEditConflicts } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditConflicts";
import { EditorPayload } from "../decorators/payload/EditorPayload";

/**
 * Retrieve detailed information about a specific edit conflict by its unique
 * identifier.
 *
 * This operation fetches from the flex_office_edit_conflicts table the conflict
 * data, including the page and editor references, JSON-encoded conflict
 * details, and creation timestamp.
 *
 * Access is restricted to editor and admin roles. Authorization is handled
 * outside this function.
 *
 * @param props - Object containing the authenticated editor and the unique edit
 *   conflict ID.
 * @param props.editor - The authenticated editor making the request.
 * @param props.editConflictId - The UUID of the edit conflict to retrieve.
 * @returns A Promise resolving to IFlexOfficeEditConflicts entity matching the
 *   requested conflict.
 * @throws {Error} Throws if the edit conflict with the specified ID is not
 *   found.
 */
export async function getflexOfficeEditorEditConflictsEditConflictId(props: {
  editor: EditorPayload;
  editConflictId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeEditConflicts> {
  const { editConflictId } = props;

  const conflict =
    await MyGlobal.prisma.flex_office_edit_conflicts.findUniqueOrThrow({
      where: { id: editConflictId },
      select: {
        id: true,
        page_id: true,
        editor_id: true,
        conflict_data: true,
        created_at: true,
      },
    });

  return {
    id: conflict.id,
    page_id: conflict.page_id,
    editor_id: conflict.editor_id,
    conflict_data: conflict.conflict_data,
    created_at: toISOStringSafe(conflict.created_at),
  };
}
