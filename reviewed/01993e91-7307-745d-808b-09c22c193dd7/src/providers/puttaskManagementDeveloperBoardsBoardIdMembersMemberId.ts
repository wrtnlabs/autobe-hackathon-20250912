import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Update a board member's information
 *
 * This operation updates information of an existing member associated with a
 * board. The member is identified by memberId, and the board is identified by
 * boardId.
 *
 * Authorization is required: only authenticated developer users can perform
 * this.
 *
 * @param props - Properties including the authenticated developer user,
 *   boardId, memberId, and update data
 * @param props.developer - The authenticated developer performing the update
 * @param props.boardId - UUID of the board the member belongs to
 * @param props.memberId - UUID of the member record to update
 * @param props.body - Update payload with membership information fields
 * @returns The updated board member record
 * @throws {Error} If the board member does not exist or is already deleted
 */
export async function puttaskManagementDeveloperBoardsBoardIdMembersMemberId(props: {
  developer: DeveloperPayload;
  boardId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
  body: ITaskManagementBoardMember.IUpdate;
}): Promise<ITaskManagementBoardMember> {
  const { developer, boardId, memberId, body } = props;

  // Verify the existing board member record
  const existing =
    await MyGlobal.prisma.task_management_board_members.findFirst({
      where: {
        id: memberId,
        board_id: boardId,
        deleted_at: null,
      },
    });

  if (!existing) {
    throw new Error("Board member not found or already deleted");
  }

  // Perform the update
  const updated = await MyGlobal.prisma.task_management_board_members.update({
    where: { id: memberId },
    data: {
      board_id: body.board_id ?? undefined,
      user_id: body.user_id ?? undefined,
      created_at: body.created_at
        ? toISOStringSafe(body.created_at)
        : undefined,
      updated_at: body.updated_at
        ? toISOStringSafe(body.updated_at)
        : undefined,
      deleted_at:
        body.deleted_at === null
          ? null
          : body.deleted_at
            ? toISOStringSafe(body.deleted_at)
            : undefined,
    },
  });

  // Return with proper date conversions
  return {
    id: updated.id,
    board_id: updated.board_id,
    user_id: updated.user_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
