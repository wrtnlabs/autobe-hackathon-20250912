import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Retrieves detailed information about a specific member of a board in the Task
 * Management system.
 *
 * This function is accessible by authenticated PMO users and returns the
 * membership details for the specified memberId within the given boardId,
 * excluding soft-deleted records.
 *
 * @param props - Parameters including the PMO payload, board ID, and member ID.
 * @param props.pmo - Authenticated PMO user payload.
 * @param props.boardId - UUID of the board to query.
 * @param props.memberId - UUID of the member in the board.
 * @returns Detailed information about the board member membership.
 * @throws {Error} Throws if the membership record is not found or is
 *   soft-deleted.
 */
export async function gettaskManagementPmoBoardsBoardIdMembersMemberId(props: {
  pmo: PmoPayload;
  boardId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementBoardMember> {
  const { pmo, boardId, memberId } = props;

  const membership =
    await MyGlobal.prisma.task_management_board_members.findFirstOrThrow({
      where: {
        id: memberId,
        board_id: boardId,
        deleted_at: null,
      },
    });

  return {
    id: membership.id,
    board_id: membership.board_id,
    user_id: membership.user_id,
    created_at: toISOStringSafe(membership.created_at),
    updated_at: toISOStringSafe(membership.updated_at),
    deleted_at: membership.deleted_at
      ? toISOStringSafe(membership.deleted_at)
      : null,
  };
}
