import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Update a board member's information.
 *
 * This operation updates the membership details of a user associated with a
 * specific board. It ensures that the member belongs to the given board and
 * then applies the requested updates.
 *
 * Authorization is enforced through the 'designer' role provided as a
 * parameter.
 *
 * @param props Destructured parameter object
 * @param props.designer The authenticated designer performing the update
 * @param props.boardId UUID of the board the member belongs to
 * @param props.memberId UUID of the member to update
 * @param props.body Partial update payload for the board member
 * @returns The updated board member record
 * @throws Error If the existing member's board_id does not match the provided
 *   boardId
 */
export async function puttaskManagementDesignerBoardsBoardIdMembersMemberId(props: {
  designer: DesignerPayload;
  boardId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
  body: ITaskManagementBoardMember.IUpdate;
}): Promise<ITaskManagementBoardMember> {
  const { designer, boardId, memberId, body } = props;

  // Fetch existing board member record
  const existing =
    await MyGlobal.prisma.task_management_board_members.findUniqueOrThrow({
      where: { id: memberId },
    });

  // Verify the member belongs to the specified board
  if (existing.board_id !== boardId) {
    throw new Error(
      `Board ID mismatch: provided boardId ${boardId} does not match member's board_id ${existing.board_id}`,
    );
  }

  // Current time ISO string for updated_at fallback if needed
  const now = toISOStringSafe(new Date());

  // Prepare update payload inline without intermediate variable
  const updated = await MyGlobal.prisma.task_management_board_members.update({
    where: { id: memberId },
    data: {
      ...(body.board_id !== undefined && { board_id: body.board_id }),
      ...(body.user_id !== undefined && { user_id: body.user_id }),
      ...(body.created_at !== undefined && { created_at: body.created_at }),
      ...(body.updated_at !== undefined
        ? { updated_at: body.updated_at }
        : { updated_at: now }),
      ...(body.deleted_at !== undefined && { deleted_at: body.deleted_at }),
    },
  });

  // Return data ensuring all DateTimes are ISO strings or null for deleted_at
  return {
    id: updated.id,
    board_id: updated.board_id,
    user_id: updated.user_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
