import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import { IPageITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementProject";
import { DesignerPayload } from "../decorators/payload/DesignerPayload";

/**
 * Search and retrieve a filtered, paginated list of projects.
 *
 * This operation enables authenticated designers to browse projects with
 * advanced filtering and pagination support.
 *
 * @param props - Properties including authenticated designer and request body
 *   for filtering/pagination
 * @param props.designer - Authenticated designer user
 * @param props.body - Request body containing filtering and pagination
 *   parameters
 * @returns Paginated list of project summaries matching search criteria
 * @throws {Error} On database query failures
 */
export async function patchtaskManagementDesignerProjects(props: {
  designer: DesignerPayload;
  body: ITaskManagementProject.IRequest;
}): Promise<IPageITaskManagementProject.ISummary> {
  const { designer, body } = props;

  // Default pagination
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  // Build where clause
  const where = {
    deleted_at: null,
    ...(body.code !== undefined && body.code !== null && { code: body.code }),
    ...(body.name !== undefined &&
      body.name !== null && { name: { contains: body.name } }),
    ...(body.owner_id !== undefined &&
      body.owner_id !== null && { owner_id: body.owner_id }),
    ...(body.search !== undefined && body.search !== null
      ? {
          OR: [
            { code: { contains: body.search } },
            { name: { contains: body.search } },
          ],
        }
      : {}),
  };

  const skip = (page - 1) * limit;

  // Perform concurrent queries
  const [dataRaw, total] = await Promise.all([
    MyGlobal.prisma.task_management_projects.findMany({
      where,
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
    MyGlobal.prisma.task_management_projects.count({ where }),
  ]);

  // Map and convert to proper ISO strings
  const data = dataRaw.map((proj) => ({
    id: proj.id as string & tags.Format<"uuid">,
    code: proj.code,
    name: proj.name,
    created_at: toISOStringSafe(proj.created_at),
    updated_at: toISOStringSafe(proj.updated_at),
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
