import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementBoard";
import { IPageITaskManagementBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementBoard";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Retrieves a paginated list of task management boards associated with the
 * specified project ID.
 *
 * This function supports filtering by board name and owner ID, pagination, and
 * sorting based on request body parameters. It ensures that only non-deleted
 * boards (soft delete applied) are included.
 *
 * @param props - The input properties containing the PMO user payload, the
 *   projectId, and the filtering request body.
 * @param props.pmo - Authenticated PMO user payload making the request.
 * @param props.projectId - UUID string identifying the project whose boards are
 *   being queried.
 * @param props.body - Request body containing optional filters, pagination, and
 *   sorting parameters.
 * @returns A paginated summary of boards matching the criteria.
 * @throws {Error} Throws an error if the database operation fails.
 */
export async function patchtaskManagementPmoProjectsProjectIdBoards(props: {
  pmo: PmoPayload;
  projectId: string & tags.Format<"uuid">;
  body: ITaskManagementBoard.IRequest;
}): Promise<IPageITaskManagementBoard.ISummary> {
  const { pmo, projectId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const whereCondition = {
    project_id: projectId,
    deleted_at: null,
    ...(body.name !== undefined &&
      body.name !== null && {
        name: { contains: body.name },
      }),
    ...(body.owner_id !== undefined &&
      body.owner_id !== null && {
        owner_id: body.owner_id,
      }),
  };

  const [boards, total] = await Promise.all([
    MyGlobal.prisma.task_management_boards.findMany({
      where: whereCondition,
      orderBy: ((): { [key: string]: "asc" | "desc" } => {
        const sortBy =
          body.sortBy &&
          (body.sortBy === "name" || body.sortBy === "created_at")
            ? body.sortBy
            : "created_at";
        const sortDirection = body.sortDirection === "asc" ? "asc" : "desc";
        return { [sortBy]: sortDirection };
      })(),
      skip: skip,
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
    MyGlobal.prisma.task_management_boards.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: boards.map((b) => ({
      id: b.id as string & tags.Format<"uuid">,
      project_id: b.project_id as string & tags.Format<"uuid">,
      code: b.code,
      name: b.name,
      created_at: toISOStringSafe(b.created_at),
      updated_at: toISOStringSafe(b.updated_at),
    })),
  };
}
