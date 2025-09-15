import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Create a new board member.
 *
 * This operation creates a new membership record linking a user to a specified
 * board. It validates that the board and user exist and are not soft deleted.
 * It ensures the user is not already a member before creating the record.
 *
 * @param props - Properties including the authenticated developer, board ID,
 *   and the membership creation payload.
 * @param props.developer - The authenticated developer performing the
 *   operation.
 * @param props.boardId - The UUID of the board to add the member to.
 * @param props.body - The membership creation request, including user_id and
 *   optional deleted_at timestamp.
 * @returns The newly created board member record.
 * @throws {Error} When the board does not exist or is soft deleted.
 * @throws {Error} When the user does not exist or is soft deleted.
 * @throws {Error} When the user is already a member of the board.
 */
export async function posttaskManagementDeveloperBoardsBoardIdMembers(props: {
  developer: DeveloperPayload;
  boardId: string & tags.Format<"uuid">;
  body: ITaskManagementBoardMember.ICreate;
}): Promise<ITaskManagementBoardMember> {
  const { developer, boardId, body } = props;

  const board = await MyGlobal.prisma.task_management_boards.findUniqueOrThrow({
    where: { id: boardId },
  });
  if (board.deleted_at !== null && board.deleted_at !== undefined) {
    throw new Error("Board is deleted");
  }

  const user = await MyGlobal.prisma.task_management_tpm.findUniqueOrThrow({
    where: { id: body.user_id },
  });
  if (user.deleted_at !== null && user.deleted_at !== undefined) {
    throw new Error("User is deleted");
  }

  const existingMember =
    await MyGlobal.prisma.task_management_board_members.findFirst({
      where: { board_id: boardId, user_id: body.user_id },
    });
  if (existingMember) {
    throw new Error("User is already a board member");
  }

  const now = toISOStringSafe(new Date());

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

  return {
    id: created.id,
    board_id: created.board_id,
    user_id: created.user_id,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: created.deleted_at ?? null,
  };
}
