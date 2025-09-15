import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import { QaPayload } from "../decorators/payload/QaPayload";

export async function posttaskManagementQaBoardsBoardIdMembers(props: {
  qa: QaPayload;
  boardId: string & tags.Format<"uuid">;
  body: ITaskManagementBoardMember.ICreate;
}): Promise<ITaskManagementBoardMember> {
  const { qa, boardId, body } = props;

  // Verify that the QA user to be added exists and is not soft-deleted
  const user = await MyGlobal.prisma.task_management_qa.findFirst({
    where: { id: body.user_id, deleted_at: null },
  });
  if (!user) throw new Error("User not found");

  // Verify that the board exists and is not soft-deleted
  const board = await MyGlobal.prisma.task_management_boards.findFirst({
    where: { id: boardId, deleted_at: null },
  });
  if (!board) throw new Error("Board not found");

  // Verify the user is not already a member of the board
  const existingMember =
    await MyGlobal.prisma.task_management_board_members.findFirst({
      where: { board_id: boardId, user_id: body.user_id, deleted_at: null },
    });
  if (existingMember) throw new Error("User is already a member of the board");

  // Prepare current timestamps formatted as ISO strings
  const now = toISOStringSafe(new Date());

  // Create the board member record
  const created = await MyGlobal.prisma.task_management_board_members.create({
    data: {
      id: v4(),
      board_id: boardId,
      user_id: body.user_id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Return the created board member data
  return {
    id: created.id,
    board_id: created.board_id,
    user_id: created.user_id,
    created_at: created.created_at,
    updated_at: created.updated_at,
    deleted_at: null,
  };
}
