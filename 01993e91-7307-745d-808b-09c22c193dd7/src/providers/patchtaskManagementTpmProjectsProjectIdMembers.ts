import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";
import { IPageITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementProjectMember";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Retrieves a paginated list of TPM project members for a specific project ID.
 *
 * This endpoint supports filtering by user ID prefix, pagination (page and
 * limit), and requires the requesting TPM user to be the owner of the project.
 *
 * @param props - Object containing TPM user payload, projectId, and request
 *   filters
 * @param props.tpm - Authenticated TPM user
 * @param props.projectId - UUID of the target project
 * @param props.body - Search and pagination parameters
 * @returns Paginated list of project members matching criteria
 * @throws {Error} When the project does not exist or TPM user is unauthorized
 */
export async function patchtaskManagementTpmProjectsProjectIdMembers(props: {
  tpm: TpmPayload;
  projectId: string & tags.Format<"uuid">;
  body: ITaskManagementProjectMember.IRequest;
}): Promise<IPageITaskManagementProjectMember> {
  const { tpm, projectId, body } = props;

  // Verify TPM user ownership of the project
  const project = await MyGlobal.prisma.task_management_projects.findFirst({
    where: {
      id: projectId,
      owner_id: tpm.id,
      deleted_at: null,
    },
  });
  if (!project) {
    throw new Error("Unauthorized or project not found");
  }

  // Set pagination parameters with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build where filter for members
  const where = {
    project_id: projectId,
    deleted_at: null,
    ...(body.search !== undefined && body.search !== null && body.search !== ""
      ? { user_id: { contains: body.search } }
      : {}),
  };

  // Fetch members and count
  const [members, total] = await Promise.all([
    MyGlobal.prisma.task_management_project_members.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.task_management_project_members.count({ where }),
  ]);

  // Map to ITaskManagementProjectMember with date conversion
  const data = members.map((m) => ({
    id: m.id,
    project_id: m.project_id,
    user_id: m.user_id,
    created_at: toISOStringSafe(m.created_at),
    updated_at: toISOStringSafe(m.updated_at),
    deleted_at: m.deleted_at ? toISOStringSafe(m.deleted_at) : null,
  }));

  // Return paginated result
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
