import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Retrieve details about a specific board member
 *
 * This endpoint fetches membership details of a user (member) associated with a
 * specific board. It returns all membership information such as creation,
 * update timestamps, and soft-delete status, if applicable.
 *
 * Authorization: Requires authenticated Project Manager (PM) role.
 *
 * @param props - Object containing pm, boardId, and memberId
 * @param props.pm - The authenticated Project Manager's payload
 * @param props.boardId - UUID of the board
 * @param props.memberId - UUID of the member user
 * @returns Detailed board member membership information
 * @throws {Error} Throws if the membership does not exist or is soft deleted
 */
export async function gettaskManagementPmBoardsBoardIdMembersMemberId(props: {
  pm: PmPayload;
  boardId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementBoardMember> {
  const { pm, boardId, memberId } = props;

  // Fetch the board member where not soft deleted
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
