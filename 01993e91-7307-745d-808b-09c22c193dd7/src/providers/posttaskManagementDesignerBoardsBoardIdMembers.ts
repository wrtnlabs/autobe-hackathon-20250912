import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Creates a new board member association for a given board and user.
 *
 * This operation ensures the specified board and user exist and that the user
 * is not already a member before creating a new membership record. It sets
 * created_at and updated_at timestamps to the current time and supports soft
 * deletion via the deleted_at field.
 *
 * @param props - Object containing the designer (authenticated user), boardId
 *   (UUID of the target board), and body (membership creation details including
 *   user_id and optional deleted_at).
 * @returns The newly created board member record conforming to
 *   ITaskManagementBoardMember.
 * @throws {Error} If the user is already a member of the board.
 * @throws {Error} If the board does not exist.
 * @throws {Error} If the user does not exist.
 */
export async function posttaskManagementDesignerBoardsBoardIdMembers(props: {
  designer: DesignerPayload;
  boardId: string & tags.Format<"uuid">;
  body: ITaskManagementBoardMember.ICreate;
}): Promise<ITaskManagementBoardMember> {
  const { designer, boardId, body } = props;

  // Verify board existence
  await MyGlobal.prisma.task_management_boards.findUniqueOrThrow({
    where: { id: boardId },
  });

  // Verify user existence
  await MyGlobal.prisma.task_management_tpm.findUniqueOrThrow({
    where: { id: body.user_id },
  });

  // Check if membership already exists
  const existing =
    await MyGlobal.prisma.task_management_board_members.findFirst({
      where: {
        board_id: boardId,
        user_id: body.user_id,
      },
    });

  if (existing) {
    throw new Error("User is already a member of this board");
  }

  const now = toISOStringSafe(new Date());

  // Create new member
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
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
    deleted_at: created.deleted_at ?? null,
  };
}
