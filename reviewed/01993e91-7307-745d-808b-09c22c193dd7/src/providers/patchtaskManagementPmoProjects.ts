import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import { IPageITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementProject";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Search and retrieve a filtered, paginated list of projects.
 *
 * Retrieves projects from task_management_projects table supporting filtering
 * by code, name, owner_id, and free text search. Pagination with page and limit
 * parameters controls result set size. Returns summarized project info
 * including id, code, name, created_at, and updated_at.
 *
 * @param props - The request properties containing authentication and query
 *   body.
 * @param props.pmo - Authenticated PMO payload.
 * @param props.body - Request body with pagination and filters.
 * @returns A paginated summary list of projects matching criteria.
 * @throws {Error} If any database operation fails.
 */
export async function patchtaskManagementPmoProjects(props: {
  pmo: PmoPayload;
  body: ITaskManagementProject.IRequest;
}): Promise<IPageITaskManagementProject.ISummary> {
  const { pmo, body } = props;

  // Normalize and default pagination parameters
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  // Build where clause for filtering
  const whereConditions: {
    deleted_at: null;
    OR?: { code: { contains: string } }[];
    code?: string;
    name?: { contains: string };
    owner_id?: string & tags.Format<"uuid">;
  } = {
    deleted_at: null,
  };

  if (body.search !== undefined && body.search !== null) {
    whereConditions.OR = [
      { code: { contains: body.search } },
      { name: { contains: body.search } },
    ];
  }

  if (body.code !== undefined && body.code !== null) {
    whereConditions.code = body.code;
  }

  if (body.name !== undefined && body.name !== null) {
    whereConditions.name = { contains: body.name };
  }

  if (body.owner_id !== undefined && body.owner_id !== null) {
    whereConditions.owner_id = body.owner_id;
  }

  // Query projects and count concurrently
  const [projects, total] = await Promise.all([
    MyGlobal.prisma.task_management_projects.findMany({
      where: whereConditions,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.task_management_projects.count({ where: whereConditions }),
  ]);

  // Return paginated summary
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: projects.map((project) => ({
      id: project.id as string & tags.Format<"uuid">,
      code: project.code,
      name: project.name,
      created_at: toISOStringSafe(project.created_at),
      updated_at: toISOStringSafe(project.updated_at),
    })),
  };
}
