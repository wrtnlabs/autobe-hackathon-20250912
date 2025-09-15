import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import { IPageITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementProject";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Searches and retrieves a filtered, paginated list of task management
 * projects.
 *
 * This endpoint supports filtering projects by owner_id, code, name, and a
 * general search term that filters code or name. It also supports pagination
 * through page and limit parameters.
 *
 * All date fields in the result are converted to ISO 8601 date-time strings and
 * branded properly.
 *
 * @param props - The properties object.
 * @param props.developer - The authenticated developer user payload.
 * @param props.body - The request body containing filtering and pagination
 *   parameters.
 * @returns A paginated summary list of projects.
 * @throws {Error} When there is a database access error.
 */
export async function patchtaskManagementDeveloperProjects(props: {
  developer: DeveloperPayload;
  body: ITaskManagementProject.IRequest;
}): Promise<IPageITaskManagementProject.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.owner_id !== undefined &&
      body.owner_id !== null && { owner_id: body.owner_id }),
    ...(body.code !== undefined &&
      body.code !== null && { code: { contains: body.code } }),
    ...(body.name !== undefined &&
      body.name !== null && { name: { contains: body.name } }),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { code: { contains: body.search } },
          { name: { contains: body.search } },
        ],
      }),
  };

  const [projects, total] = await Promise.all([
    MyGlobal.prisma.task_management_projects.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.task_management_projects.count({ where }),
  ]);

  const data = projects.map((project) => ({
    id: project.id,
    code: project.code,
    name: project.name,
    created_at: toISOStringSafe(project.created_at),
    updated_at: toISOStringSafe(project.updated_at),
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
