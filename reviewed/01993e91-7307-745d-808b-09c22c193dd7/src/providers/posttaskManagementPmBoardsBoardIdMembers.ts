import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Creates a new membership record for a user joining a specified board within
 * the Task Management system. It verifies the existence and active status of
 * the board and user, prevents duplicate memberships, and returns the newly
 * created membership record.
 *
 * @param props - Object containing the PM user info, boardId path parameter,
 *   and membership creation data.
 * @param props.pm - The authenticated Project Manager performing the operation.
 * @param props.boardId - UUID of the board to add a member to.
 * @param props.body - Data for creating the board member association, including
 *   user_id and timestamps.
 * @returns The newly created board member membership record.
 * @throws {Error} When the board does not exist or is soft-deleted.
 * @throws {Error} When the user does not exist or is soft-deleted.
 * @throws {Error} When the user is already a member of the board.
 */
export async function posttaskManagementPmBoardsBoardIdMembers(props: {
  pm: PmPayload;
  boardId: string & tags.Format<"uuid">;
  body: ITaskManagementBoardMember.ICreate;
}): Promise<ITaskManagementBoardMember> {
  const { pm, boardId, body } = props;

  // Verify that the board exists and is not soft-deleted
  const board = await MyGlobal.prisma.task_management_boards.findUnique({
    where: { id: boardId },
  });
  if (!board || board.deleted_at !== null) {
    throw new Error("Board not found or deleted");
  }

  // Verify that the user exists and is not soft-deleted
  const user = await MyGlobal.prisma.task_management_tpm.findUnique({
    where: { id: body.user_id },
  });
  if (!user || user.deleted_at !== null) {
    throw new Error("User not found or deleted");
  }

  // Check if the membership already exists
  const existingMember =
    await MyGlobal.prisma.task_management_board_members.findFirst({
      where: {
        board_id: boardId,
        user_id: body.user_id,
      },
    });
  if (existingMember) {
    throw new Error("User is already a member of the board");
  }

  // Create the new board member record
  const created = await MyGlobal.prisma.task_management_board_members.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      board_id: boardId,
      user_id: body.user_id,
      created_at: body.created_at,
      updated_at: body.updated_at,
      deleted_at: body.deleted_at ?? null,
    },
  });

  // Return the created membership with dates safely converted
  return {
    id: created.id,
    board_id: created.board_id,
    user_id: created.user_id,
    created_at: created.created_at
      ? toISOStringSafe(created.created_at)
      : created.created_at,
    updated_at: created.updated_at
      ? toISOStringSafe(created.updated_at)
      : created.updated_at,
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
