import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import { IPageITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementBoardMember";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Retrieves a paginated list of members for the specified board.
 *
 * This operation supports filtering by user_id substring, sorting by specified
 * fields, and pagination controls (page and limit).
 *
 * Only users with TPM or PMO roles are authorized to access this data.
 *
 * @param props - Object containing authenticated TPM payload, boardId, and
 *   request body parameters
 * @param props.tpm - Authenticated TPM user payload
 * @param props.boardId - UUID of the target board
 * @param props.body - Request body containing filtering, sorting, and
 *   pagination criteria
 * @returns Paginated summary of board members matching the criteria
 * @throws {Error} When the database query fails or invalid parameters are
 *   provided
 */
export async function patchtaskManagementTpmBoardsBoardIdMembers(props: {
  tpm: TpmPayload;
  boardId: string & tags.Format<"uuid">;
  body: ITaskManagementBoardMember.IRequest;
}): Promise<IPageITaskManagementBoardMember.ISummary> {
  const { tpm, boardId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const whereConditions = {
    board_id: boardId,
    deleted_at: null,
    ...(body.search !== undefined && body.search !== null && body.search !== ""
      ? { user_id: { contains: body.search } }
      : {}),
  };

  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.sort !== undefined && body.sort !== null && body.sort !== "") {
    const sortSplit = body.sort.trim().split(/\s+/);
    if (sortSplit.length === 2) {
      const [field, direction] = sortSplit;
      if (
        ["id", "board_id", "user_id", "created_at", "updated_at"].includes(
          field,
        ) &&
        (direction.toLowerCase() === "asc" ||
          direction.toLowerCase() === "desc")
      ) {
        orderBy = { [field]: direction.toLowerCase() as "asc" | "desc" };
      }
    }
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.task_management_board_members.findMany({
      where: whereConditions,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.task_management_board_members.count({
      where: whereConditions,
    }),
  ]);

  const data = results.map((item) => ({
    id: item.id,
    board_id: item.board_id,
    user_id: item.user_id,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
