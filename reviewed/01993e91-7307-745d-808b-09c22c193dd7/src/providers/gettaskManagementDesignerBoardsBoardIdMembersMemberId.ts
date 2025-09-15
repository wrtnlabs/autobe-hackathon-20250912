import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Retrieves detailed membership information for a specific board member.
 *
 * This function fetches the board membership record from the
 * task_management_board_members table given the boardId and memberId. It
 * respects soft delete semantics by excluding membership records with a
 * non-null deleted_at timestamp.
 *
 * Authentication and authorization are expected to be handled externally (e.g.,
 * decorators).
 *
 * @param props - The input properties
 * @param props.designer - The authenticated designer payload
 * @param props.boardId - The UUID of the board to query
 * @param props.memberId - The UUID of the member user to query
 * @returns The detailed board member membership information
 * @throws {Error} When no matching membership record is found
 */
export async function gettaskManagementDesignerBoardsBoardIdMembersMemberId(props: {
  designer: DesignerPayload;
  boardId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementBoardMember> {
  const { boardId, memberId } = props;

  const found =
    await MyGlobal.prisma.task_management_board_members.findFirstOrThrow({
      where: {
        board_id: boardId,
        user_id: memberId,
        deleted_at: null,
      },
    });

  return {
    id: found.id,
    board_id: found.board_id,
    user_id: found.user_id,
    created_at: toISOStringSafe(found.created_at),
    updated_at: toISOStringSafe(found.updated_at),
    deleted_at: found.deleted_at ? toISOStringSafe(found.deleted_at) : null,
  };
}
