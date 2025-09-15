import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Create a new board member
 *
 * This operation creates a new membership record for a user joining a specified
 * board within the Task Management system. It verifies the board and user
 * existence, checks for duplicate membership, and creates a new member record
 * with audit timestamps.
 *
 * @param props - Function parameters
 * @param props.tpm - Authenticated TPM user payload
 * @param props.boardId - UUID of the board where the member is added
 * @param props.body - Board member creation data
 * @returns The newly created board member record
 * @throws {Error} When the board does not exist
 * @throws {Error} When the user does not exist
 * @throws {Error} When the user is already a member of the board
 */
export async function posttaskManagementTpmBoardsBoardIdMembers(props: {
  tpm: TpmPayload;
  boardId: string & tags.Format<"uuid">;
  body: ITaskManagementBoardMember.ICreate;
}): Promise<ITaskManagementBoardMember> {
  const { tpm, boardId, body } = props;

  // Validate board existence
  const board = await MyGlobal.prisma.task_management_boards.findFirst({
    where: {
      id: boardId,
      deleted_at: null,
    },
  });
  if (!board) throw new Error("Board not found");

  // Validate user existence
  const user = await MyGlobal.prisma.task_management_tpm.findFirst({
    where: {
      id: body.user_id,
      deleted_at: null,
    },
  });
  if (!user) throw new Error("User not found");

  // Check for existing membership
  const existing =
    await MyGlobal.prisma.task_management_board_members.findFirst({
      where: {
        board_id: boardId,
        user_id: body.user_id,
        deleted_at: null,
      },
    });
  if (existing) throw new Error("User is already a member of this board");

  // Create new membership
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.task_management_board_members.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      board_id: boardId,
      user_id: body.user_id,
      created_at: now,
      updated_at: now,
      deleted_at: undefined,
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
