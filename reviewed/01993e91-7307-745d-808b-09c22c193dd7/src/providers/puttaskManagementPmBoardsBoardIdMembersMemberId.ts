import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Updates an existing board member's information in the Task Management system.
 *
 * This operation modifies membership data of a specified member user associated
 * with a board. It ensures the member exists and belongs to the provided board
 * before updating. The update supports modification of board membership details
 * including timestamps and soft-deletion flags while maintaining data
 * integrity.
 *
 * Authorization is controlled by PM role verifying the requester's permissions.
 *
 * @param props - Object containing the authenticated PM user, board ID, member
 *   ID, and update body.
 * @param props.pm - Authenticated PM user payload.
 * @param props.boardId - UUID of the board.
 * @param props.memberId - UUID of the board member user.
 * @param props.body - Update data for the board member.
 * @returns The updated board member record.
 * @throws {Error} When the board member does not exist or IDs mismatch.
 */
export async function puttaskManagementPmBoardsBoardIdMembersMemberId(props: {
  pm: PmPayload;
  boardId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
  body: ITaskManagementBoardMember.IUpdate;
}): Promise<ITaskManagementBoardMember> {
  const { pm, boardId, memberId, body } = props;

  // Find the existing board member by composite unique key
  const existingMember =
    await MyGlobal.prisma.task_management_board_members.findUniqueOrThrow({
      where: {
        board_id_user_id: {
          board_id: boardId,
          user_id: memberId,
        },
      },
    });

  if (
    body.board_id !== undefined &&
    body.board_id !== existingMember.board_id
  ) {
    throw new Error("Cannot change board_id to a different value");
  }

  if (body.user_id !== undefined && body.user_id !== existingMember.user_id) {
    throw new Error("Cannot change user_id to a different value");
  }

  // Current timestamp for updated_at
  const now = toISOStringSafe(new Date());

  // Perform update with provided fields plus updated_at
  const updated = await MyGlobal.prisma.task_management_board_members.update({
    where: {
      id: existingMember.id,
    },
    data: {
      board_id: body.board_id ?? undefined,
      user_id: body.user_id ?? undefined,
      created_at: body.created_at ?? undefined,
      updated_at: now,
      deleted_at:
        body.deleted_at === null ? null : (body.deleted_at ?? undefined),
    },
  });

  return {
    id: updated.id,
    board_id: updated.board_id,
    user_id: updated.user_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
