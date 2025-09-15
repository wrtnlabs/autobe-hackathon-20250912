import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";
import { IPageITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementProjectMember";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Retrieves a paginated list of members for a specific project.
 *
 * Authorization:
 *
 * - Only the PM who owns the project can access the members.
 *
 * Pagination and Filtering:
 *
 * - Supports pagination with page and limit.
 * - Supports search which filters by exact user_id if search term is a valid UUID
 *   length.
 *
 * Throws errors if project not found or unauthorized access.
 *
 * @param props - Object containing PM payload, projectId, and request body with
 *   filters and pagination.
 * @returns Paginated list of project members with audit timestamps.
 * @throws Error when project is not found.
 * @throws Error when PM is unauthorized to access the project.
 */
export async function patchtaskManagementPmProjectsProjectIdMembers(props: {
  pm: PmPayload;
  projectId: string & tags.Format<"uuid">;
  body: ITaskManagementProjectMember.IRequest;
}): Promise<IPageITaskManagementProjectMember> {
  const { pm, projectId, body } = props;

  const project = await MyGlobal.prisma.task_management_projects.findUnique({
    where: { id: projectId },
    select: { owner_id: true },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  if (project.owner_id !== pm.id) {
    throw new Error("Unauthorized: You do not own this project");
  }

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  const skip = (page - 1) * limit;

  const where: {
    project_id: string & tags.Format<"uuid">;
    deleted_at: null;
    user_id?: string & tags.Format<"uuid">;
  } = {
    project_id: projectId,
    deleted_at: null,
  };

  if (typeof body.search === "string" && body.search.length === 36) {
    where.user_id = body.search as string & tags.Format<"uuid">;
  }

  const total = await MyGlobal.prisma.task_management_project_members.count({
    where,
  });

  const members =
    await MyGlobal.prisma.task_management_project_members.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: members.map((m) => ({
      id: m.id,
      project_id: m.project_id,
      user_id: m.user_id,
      created_at: toISOStringSafe(m.created_at),
      updated_at: toISOStringSafe(m.updated_at),
      deleted_at: m.deleted_at ? toISOStringSafe(m.deleted_at) : null,
    })),
  };
}
