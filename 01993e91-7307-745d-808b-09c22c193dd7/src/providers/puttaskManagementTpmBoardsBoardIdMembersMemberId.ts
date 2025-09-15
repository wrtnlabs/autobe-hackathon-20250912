import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Update a board member's information
 *
 * This operation updates an existing board member's record within the Task
 * Management system. It ensures that the member belongs to the specified board
 * and updates allowed fields.
 *
 * @param props - Object containing authentication, path parameters, and body
 * @param props.tpm - TPM user performing the update
 * @param props.boardId - UUID of the board
 * @param props.memberId - UUID of the board member user
 * @param props.body - Partial update for the board member fields
 * @returns The updated board member information
 * @throws {Error} If the member record does not exist or does not belong to the
 *   board
 */
export async function puttaskManagementTpmBoardsBoardIdMembersMemberId(props: {
  tpm: TpmPayload;
  boardId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
  body: ITaskManagementBoardMember.IUpdate;
}): Promise<ITaskManagementBoardMember> {
  const { tpm, boardId, memberId, body } = props;

  const existing =
    await MyGlobal.prisma.task_management_board_members.findFirst({
      where: {
        id: memberId,
        board_id: boardId,
      },
    });

  if (!existing) {
    throw new Error("Member not found or does not belong to the board");
  }

  const updated = await MyGlobal.prisma.task_management_board_members.update({
    where: { id: memberId },
    data: {
      ...(body.board_id !== undefined && { board_id: body.board_id }),
      ...(body.user_id !== undefined && { user_id: body.user_id }),
      ...(body.created_at !== undefined && {
        created_at: toISOStringSafe(body.created_at),
      }),
      ...(body.updated_at !== undefined && {
        updated_at: toISOStringSafe(body.updated_at),
      }),
      ...(body.deleted_at !== undefined && {
        deleted_at:
          body.deleted_at === null ? null : toISOStringSafe(body.deleted_at),
      }),
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
