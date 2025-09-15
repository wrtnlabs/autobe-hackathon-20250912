import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeEditConflicts } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditConflicts";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get details of a specific edit conflict
 *
 * This operation retrieves detailed information about a specific edit conflict
 * by its unique identifier. It returns the conflict data, associated page and
 * editor, and timestamps. This supports administrators in investigating and
 * resolving collaborative edit conflicts.
 *
 * Access is restricted to users with admin role.
 *
 * @param props - Object containing admin information and edit conflict ID
 * @param props.admin - The authenticated admin user making the request
 * @param props.editConflictId - Unique identifier of the edit conflict
 * @returns Detailed information about the edit conflict
 * @throws {Error} If the edit conflict with specified ID does not exist
 */
export async function getflexOfficeAdminEditConflictsEditConflictId(props: {
  admin: AdminPayload;
  editConflictId: string & tags.Format<"uuid">;
}): Promise<IFlexOfficeEditConflicts> {
  const { admin, editConflictId } = props;
  const conflict =
    await MyGlobal.prisma.flex_office_edit_conflicts.findUniqueOrThrow({
      where: { id: editConflictId },
    });

  return {
    id: conflict.id,
    page_id: conflict.page_id,
    editor_id: conflict.editor_id,
    conflict_data: conflict.conflict_data,
    created_at: toISOStringSafe(conflict.created_at),
  };
}
