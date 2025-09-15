import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Retrieve details about a specific board member
 *
 * This operation fetches detailed membership information for a board member
 * identified by boardId and memberId. It filters out soft deleted memberships
 * and returns all relevant timestamps.
 *
 * Authorization: Requires authenticated developer.
 *
 * @param props - Object with developer, boardId, and memberId
 * @param props.developer - Authenticated developer user payload
 * @param props.boardId - UUID of the board
 * @param props.memberId - UUID of the member user
 * @returns Detailed board member membership information
 * @throws {Error} Throws if the board member does not exist or is soft deleted
 */
export async function gettaskManagementDeveloperBoardsBoardIdMembersMemberId(props: {
  developer: DeveloperPayload;
  boardId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<ITaskManagementBoardMember> {
  const record =
    await MyGlobal.prisma.task_management_board_members.findFirstOrThrow({
      where: {
        board_id: props.boardId,
        user_id: props.memberId,
        deleted_at: null,
      },
    });

  return {
    id: record.id,
    board_id: record.board_id,
    user_id: record.user_id,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
