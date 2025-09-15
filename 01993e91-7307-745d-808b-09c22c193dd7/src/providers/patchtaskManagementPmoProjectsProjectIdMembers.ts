import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementProjectMember";
import { IPageITaskManagementProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementProjectMember";
import { PmoPayload } from "../decorators/payload/PmoPayload";

/**
 * Retrieves a paginated and filtered list of project members for a specified
 * project.
 *
 * This endpoint allows authorized PMO users to view members associated with a
 * particular project by applying search filters and pagination.
 *
 * @param props - Object containing PMO payload, projectId path parameter, and
 *   request body for filtering and pagination.
 * @param props.pmo - Authenticated PMO user information.
 * @param props.projectId - UUID of the project for which to retrieve members.
 * @param props.body - Filter and pagination parameters including search term,
 *   page number, and limit per page.
 * @returns A paginated list of project members matching the criteria.
 * @throws {Error} Throws if the projectId is invalid or if user is
 *   unauthorized.
 */
export async function patchtaskManagementPmoProjectsProjectIdMembers(props: {
  pmo: PmoPayload;
  projectId: string & tags.Format<"uuid">;
  body: ITaskManagementProjectMember.IRequest;
}): Promise<IPageITaskManagementProjectMember> {
  const { pmo, projectId, body } = props;

  // Set pagination defaults
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skip = (page - 1) * limit;

  // Base where clause: project_id match and not soft deleted
  const whereBase = {
    project_id: projectId,
    deleted_at: null,
  };

  // Add search filter if search string is provided
  const where =
    body.search !== undefined &&
    body.search !== null &&
    body.search.trim() !== ""
      ? {
          ...whereBase,
          user_id: { contains: body.search },
        }
      : whereBase;

  // Fetch members and total count concurrently
  const [members, total] = await Promise.all([
    MyGlobal.prisma.task_management_project_members.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.task_management_project_members.count({
      where,
    }),
  ]);

  // Convert date fields to ISO strings and handle nullable deleted_at
  const membersFormatted = members.map((member) => ({
    id: member.id,
    project_id: member.project_id,
    user_id: member.user_id,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: membersFormatted,
  };
}
