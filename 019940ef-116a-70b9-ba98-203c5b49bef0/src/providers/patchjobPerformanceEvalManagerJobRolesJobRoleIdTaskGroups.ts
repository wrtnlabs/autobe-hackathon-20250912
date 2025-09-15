import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTaskGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskGroup";
import { IPageIJobPerformanceEvalTaskGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalTaskGroup";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Retrieves a paginated list of task groups associated with a specific job
 * role.
 *
 * This endpoint returns a filtered and paginated list of task groups under a
 * given job role. Task groups are logical groupings of tasks relevant to the
 * job role, facilitating clearer management and categorization.
 *
 * Users with authorized roles 'employee' or 'manager' can access this list.
 *
 * Filtering, sorting, and pagination parameters can be provided in the request
 * body to refine the results.
 *
 * @param props - Object containing manager authentication, jobRoleId path
 *   parameter, and request body with filtering and pagination criteria
 * @param props.manager - The authenticated manager making the request
 * @param props.jobRoleId - UUID of the job role to filter task groups
 * @param props.body - Filtering and pagination request body conforming to
 *   IJobPerformanceEvalTaskGroup.IRequest
 * @returns Paginated summary of task groups matching the criteria
 * @throws {Error} Throws error if any database operation fails
 */
export async function patchjobPerformanceEvalManagerJobRolesJobRoleIdTaskGroups(props: {
  manager: ManagerPayload;
  jobRoleId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalTaskGroup.IRequest;
}): Promise<IPageIJobPerformanceEvalTaskGroup.ISummary> {
  const { manager, jobRoleId, body } = props;

  const page = (body.page ?? 0) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = page * limit;

  const whereCondition = {
    job_role_id: jobRoleId,
    deleted_at: null,
    ...(body.code !== undefined &&
      body.code !== null && {
        code: { contains: body.code },
      }),
    ...(body.name !== undefined &&
      body.name !== null && {
        name: { contains: body.name },
      }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_task_groups.findMany({
      where: whereCondition,
      orderBy:
        body.orderBy && body.orderBy.length > 0
          ? { [body.orderBy]: "asc" }
          : { created_at: "desc" },
      skip: skip,
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
    }),
    MyGlobal.prisma.job_performance_eval_task_groups.count({
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
    data: results.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description ?? undefined,
    })),
  };
}
