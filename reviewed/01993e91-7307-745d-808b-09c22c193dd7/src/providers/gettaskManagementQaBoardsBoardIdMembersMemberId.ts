import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Retrieves detailed information about a specific QA board member by boardId
 * and memberId.
 *
 * This function queries the task_management_board_members table to find the
 * membership record for the specified board and member, ensuring the record is
 * not soft deleted. It returns the membership details including audit
 * timestamps.
 *
 * Authorization: The caller must have 'qa' role authorization.
 *
 * @param props - Object containing qa authentication payload, boardId, and
 *   memberId
 * @param props.qa - Authenticated QA user payload
 * @param props.boardId - UUID of the board to retrieve membership from
 * @param props.memberId - UUID of the member user whose membership is requested
 * @returns The detailed task management board member record
 * @throws {Error} If no membership exists for the given boardId and memberId or
 *   if soft deleted
 */
export async function gettaskManagementQaBoardsBoardIdMembersMemberId(props: {
  qa: QaPayload;
  boardId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementBoardMember> {
  const { qa, boardId, memberId } = props;

  const record =
    await MyGlobal.prisma.task_management_board_members.findFirstOrThrow({
      where: {
        board_id: boardId,
        user_id: memberId,
        deleted_at: null,
      },
    });

  return {
    id: record.id,
    board_id: record.board_id,
    user_id: record.user_id,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
