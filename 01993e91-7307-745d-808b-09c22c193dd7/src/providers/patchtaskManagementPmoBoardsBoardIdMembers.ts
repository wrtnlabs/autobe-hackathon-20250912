import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoardMember";
import { IPageITaskManagementBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementBoardMember";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Retrieves a paginated list of members associated with the specified board.
 *
 * This endpoint is accessible only to users with TPM or PMO roles. It supports
 * optional filtering by user ID, sorting, and pagination.
 *
 * @param props - Object containing authentication, board ID, and request body
 *   parameters
 * @param props.pmo - Authenticated PMO user payload
 * @param props.boardId - UUID of the target board
 * @param props.body - Request body containing pagination and filtering criteria
 * @returns Paginated summary of board members matching the criteria
 * @throws {Error} Throws error if unauthorized or database operation fails
 */
export async function patchtaskManagementPmoBoardsBoardIdMembers(props: {
  pmo: PmoPayload;
  boardId: string & tags.Format<"uuid">;
  body: ITaskManagementBoardMember.IRequest;
}): Promise<IPageITaskManagementBoardMember.ISummary> {
  const { pmo, boardId, body } = props;

  // Pagination parameters with safe defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Validate sort field and order
  let sortField: string | null = null;
  let sortOrder: "asc" | "desc" = "asc";
  if (body.sort) {
    const sortParts = body.sort.trim().split(" ");
    if (sortParts.length > 0) {
      sortField = sortParts[0];
      if (sortParts.length > 1) {
        const orderCandidate = sortParts[1].toLowerCase();
        if (orderCandidate === "desc" || orderCandidate === "asc") {
          sortOrder = orderCandidate;
        }
      }
    }
  }

  // Supported sort fields explicit list
  const supportedSortFields = ["id", "created_at", "updated_at"];
  if (!sortField || !supportedSortFields.includes(sortField)) {
    sortField = "created_at";
    sortOrder = "asc";
  }

  // Construct where condition
  const whereCondition = {
    board_id: boardId,
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search !== "" && {
        user_id: body.search,
      }),
  };

  // Fetch data and count
  const [members, total] = await Promise.all([
    MyGlobal.prisma.task_management_board_members.findMany({
      where: whereCondition,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.task_management_board_members.count({
      where: whereCondition,
    }),
  ]);

  // Map database records to DTO, converting dates to strings
  const data = members.map((member) => ({
    id: member.id,
    board_id: member.board_id,
    user_id: member.user_id,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
