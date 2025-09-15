import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Retrieve details about a specific board member.
 *
 * This operation fetches the membership record for the specified board and
 * member IDs. It excludes soft-deleted records (deleted_at is null).
 *
 * @param props - Object containing TPM user info, boardId, and memberId
 * @param props.tpm - Authenticated TPM user payload
 * @param props.boardId - UUID of the board
 * @param props.memberId - UUID of the board member user
 * @returns The board member membership record
 * @throws {Error} If the board member record does not exist or is soft deleted
 */
export async function gettaskManagementTpmBoardsBoardIdMembersMemberId(props: {
  tpm: TpmPayload;
  boardId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementBoardMember> {
  const { tpm, boardId, memberId } = props;

  const member =
    await MyGlobal.prisma.task_management_board_members.findFirstOrThrow({
      where: {
        board_id: boardId,
        user_id: memberId,
        deleted_at: null,
      },
    });

  return {
    id: member.id,
    board_id: member.board_id,
    user_id: member.user_id,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at
      ? toISOStringSafe(member.deleted_at)
      : undefined,
  };
}
