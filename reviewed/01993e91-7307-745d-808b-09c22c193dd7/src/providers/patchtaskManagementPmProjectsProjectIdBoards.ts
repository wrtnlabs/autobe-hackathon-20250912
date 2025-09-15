import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import { IPageITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementBoard";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * List boards under a specific project.
 *
 * This operation retrieves a paginated list of boards associated with the given
 * projectId. It supports filtering by board name and owner ID, pagination
 * parameters, and sorting by defined fields. Only authorized PM role can access
 * this endpoint.
 *
 * @param props - Object containing the PM payload, project ID path parameter,
 *   and request body with filters.
 * @param props.pm - The authenticated PM user payload.
 * @param props.projectId - UUID of the project to list boards for.
 * @param props.body - The request body containing filtering, sorting, and
 *   pagination options.
 * @returns Paginated summary list of boards matching the criteria.
 * @throws {Error} If database operation fails or invalid parameters are
 *   supplied.
 */
export async function patchtaskManagementPmProjectsProjectIdBoards(props: {
  pm: PmPayload;
  projectId: string & tags.Format<"uuid">;
  body: ITaskManagementBoard.IRequest;
}): Promise<IPageITaskManagementBoard.ISummary> {
  const { pm, projectId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const allowedSortFields = ["name", "created_at", "code", "updated_at"];
  let sortBy = "created_at";
  if (body.sortBy && allowedSortFields.includes(body.sortBy)) {
    sortBy = body.sortBy;
  }

  let sortDirection: "asc" | "desc" = "desc";
  if (body.sortDirection === "asc" || body.sortDirection === "desc") {
    sortDirection = body.sortDirection;
  }

  const where: any = {
    project_id: projectId,
    deleted_at: null,
  };

  if (body.name !== undefined && body.name !== null) {
    where.name = { contains: body.name };
  }

  if (body.owner_id !== undefined && body.owner_id !== null) {
    where.owner_id = body.owner_id;
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.task_management_boards.findMany({
      where,
      orderBy: {
        [sortBy]: sortDirection,
      },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        project_id: true,
        code: true,
        name: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.task_management_boards.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((board) => ({
      id: board.id as string & tags.Format<"uuid">,
      project_id: board.project_id as string & tags.Format<"uuid">,
      code: board.code,
      name: board.name,
      created_at: toISOStringSafe(board.created_at),
      updated_at: toISOStringSafe(board.updated_at),
    })),
  };
}
