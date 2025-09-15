import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Creates a new board member association for a specific board.
 *
 * This operation ensures that the specified board and user exist and that the
 * user is not already a member of the board. It generates a new UUID for the
 * membership record and assigns current timestamps for creation and update.
 *
 * @param props - Object containing the PMO payload, board ID, and new member
 *   data
 * @param props.pmo - The PMO authenticated user payload
 * @param props.boardId - UUID of the board to add a member to
 * @param props.body - The membership creation data including user ID and
 *   optional soft delete
 * @returns The newly created board member record
 * @throws {Error} If the board or user does not exist
 * @throws {Error} If the user is already a member of the board
 */
export async function posttaskManagementPmoBoardsBoardIdMembers(props: {
  pmo: PmoPayload;
  boardId: string & tags.Format<"uuid">;
  body: ITaskManagementBoardMember.ICreate;
}): Promise<ITaskManagementBoardMember> {
  const { pmo, boardId, body } = props;

  // Verify board existence
  const board = await MyGlobal.prisma.task_management_boards.findUnique({
    where: { id: boardId },
  });
  if (!board) throw new Error("Board not found");

  // Verify user existence
  const user = await MyGlobal.prisma.task_management_tpm.findUnique({
    where: { id: body.user_id },
  });
  if (!user) throw new Error("User not found");

  // Check if membership already exists
  const existingMember =
    await MyGlobal.prisma.task_management_board_members.findUnique({
      where: { board_id_user_id: { board_id: boardId, user_id: body.user_id } },
    });
  if (existingMember) throw new Error("User is already a member of the board");

  // Prepare timestamps
  const now = toISOStringSafe(new Date());

  // Create new membership
  const created = await MyGlobal.prisma.task_management_board_members.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      board_id: boardId,
      user_id: body.user_id,
      created_at: now,
      updated_at: now,
      deleted_at: body.deleted_at ?? null,
    },
  });

  // Return with date conversions
  return {
    id: created.id,
    board_id: created.board_id,
    user_id: created.user_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
