import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProject";
import { IPageITaskManagementProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementProject";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Search and retrieve a filtered, paginated list of projects.
 *
 * This function retrieves projects that are not soft-deleted, supports
 * filtering by code, name, and owner_id, and paginates results with page and
 * limit. It returns project summaries suitable for listing.
 *
 * @param props - Contains the TPM user payload and request body with filters.
 * @param props.tpm - The authenticated TPM user's payload.
 * @param props.body - Filters and pagination parameters for project search.
 * @returns A paginated summary list of projects matching the filters.
 * @throws {Error} If database access fails or unexpected conditions occur.
 */
export async function patchtaskManagementTpmProjects(props: {
  tpm: TpmPayload;
  body: ITaskManagementProject.IRequest;
}): Promise<IPageITaskManagementProject.ISummary> {
  const { tpm, body } = props;

  // Default page and limit with fallback
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  const skip = (page - 1) * limit;

  // Build where condition for filtering active projects
  const whereCondition = {
    deleted_at: null,
    ...(body.code !== null && body.code !== undefined
      ? { code: { contains: body.code } }
      : {}),
    ...(body.name !== null && body.name !== undefined
      ? { name: { contains: body.name } }
      : {}),
    ...(body.owner_id !== null && body.owner_id !== undefined
      ? { owner_id: body.owner_id }
      : {}),
  };

  // Fetch projects and total count concurrently
  const [projects, total] = await Promise.all([
    MyGlobal.prisma.task_management_projects.findMany({
      where: whereCondition,
      skip: skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.task_management_projects.count({ where: whereCondition }),
  ]);

  // Map projects to summary format with toISOStringSafe conversion
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: projects.map((project) => ({
      id: project.id,
      code: project.code,
      name: project.name,
      created_at: toISOStringSafe(project.created_at),
      updated_at: toISOStringSafe(project.updated_at),
    })),
  };
}
