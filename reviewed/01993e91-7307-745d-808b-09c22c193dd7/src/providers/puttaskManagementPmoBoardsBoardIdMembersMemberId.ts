import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Update a board member's information
 *
 * This API operation updates information of an existing member associated with
 * a board. The member is identified by memberId, and the board is identified by
 * boardId.
 *
 * The operation accepts updated membership fields via the request body.
 *
 * It relates to the task_management_board_members table that tracks membership
 * associations between users and boards, including timestamps and soft-deletion
 * flags.
 *
 * Appropriate authorization is required to modify membership information. The
 * API provides the updated membership record upon success.
 *
 * @param props - Object containing authorized PMO user info, path parameters,
 *   and update payload
 * @param props.pmo - The authenticated PMO user
 * @param props.boardId - UUID of the board to update membership in
 * @param props.memberId - UUID of the member user in the board
 * @param props.body - The update payload for the board member
 * @returns The updated board member information with timestamps
 * @throws {Error} When the member does not belong to the specified board
 * @throws {Error} When the member record is not found
 */
export async function puttaskManagementPmoBoardsBoardIdMembersMemberId(props: {
  pmo: PmoPayload;
  boardId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
  body: ITaskManagementBoardMember.IUpdate;
}): Promise<ITaskManagementBoardMember> {
  const { pmo, boardId, memberId, body } = props;

  // Validate existence and ownership in a single query
  const existing =
    await MyGlobal.prisma.task_management_board_members.findUniqueOrThrow({
      where: {
        id: memberId,
      },
    });

  if (existing.board_id !== boardId) {
    throw new Error("Board member does not belong to the specified board.");
  }

  // Update with provided fields
  const updated = await MyGlobal.prisma.task_management_board_members.update({
    where: {
      id: memberId,
    },
    data: {
      board_id: body.board_id ?? undefined,
      user_id: body.user_id ?? undefined,
      created_at: body.created_at ?? undefined,
      updated_at: body.updated_at ?? undefined,
      deleted_at: body.deleted_at ?? undefined,
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
