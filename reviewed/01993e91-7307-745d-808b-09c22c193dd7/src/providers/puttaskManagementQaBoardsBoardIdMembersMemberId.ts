import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Update a board member's information.
 *
 * This operation updates the membership information of a specified member user
 * associated with a specific board. It verifies ownership and updates only
 * provided fields along with updating the renewed timestamp.
 *
 * @param props - Properties including authorization, identifiers, and update
 *   data
 * @param props.qa - The authenticated QA user performing the operation
 * @param props.boardId - UUID of the board to which the member belongs
 * @param props.memberId - UUID of the member user to update
 * @param props.body - Updated membership fields as per
 *   ITaskManagementBoardMember.IUpdate
 * @returns The updated board member record after the operation
 * @throws {Error} When the member does not belong to the specified board
 * @throws {Error} When the member record is not found
 */
export async function puttaskManagementQaBoardsBoardIdMembersMemberId(props: {
  qa: QaPayload;
  boardId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
  body: ITaskManagementBoardMember.IUpdate;
}): Promise<ITaskManagementBoardMember> {
  const { qa, boardId, memberId, body } = props;

  // Find existing board member by memberId
  const existing =
    await MyGlobal.prisma.task_management_board_members.findUniqueOrThrow({
      where: { id: memberId },
    });

  // Authorization and business logic: Confirm board membership ownership
  if (existing.board_id !== boardId) {
    throw new Error("Board member does not belong to the specified board");
  }

  // Update fields: only assign if present
  const updated = await MyGlobal.prisma.task_management_board_members.update({
    where: { id: memberId },
    data: {
      board_id: body.board_id ?? undefined,
      user_id: body.user_id ?? undefined,
      created_at: body.created_at ?? undefined,
      updated_at: toISOStringSafe(new Date()),
      deleted_at: body.deleted_at ?? undefined,
    },
  });

  // Return record with correct date format
  return {
    id: updated.id,
    board_id: updated.board_id,
    user_id: updated.user_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
