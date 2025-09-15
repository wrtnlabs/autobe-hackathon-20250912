import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalTaskGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalTaskGroup";
import { IPageIJobPerformanceEvalTaskGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalTaskGroup";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * List task groups of a job role with filtering.
 *
 * Retrieves a paginated list of task groups associated with a specific job
 * role, supporting filtering by partial code and name, sorting, and
 * pagination.
 *
 * Authorization: Requires authenticated employee.
 *
 * @param props - Operation input containing employee payload, jobRoleId, and
 *   filtering & pagination body.
 * @param props.employee - Authenticated employee payload.
 * @param props.jobRoleId - UUID of the job role to query task groups for.
 * @param props.body - Filter and pagination parameters for the task groups.
 * @returns A paginated summary list of task groups matching the criteria.
 * @throws Error if internal database query fails.
 */
export async function patchjobPerformanceEvalEmployeeJobRolesJobRoleIdTaskGroups(props: {
  employee: EmployeePayload;
  jobRoleId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalTaskGroup.IRequest;
}): Promise<IPageIJobPerformanceEvalTaskGroup.ISummary> {
  const { employee, jobRoleId, body } = props;
  const page = (body.page ?? 0) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> &
    number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> &
    number;

  const where: {
    job_role_id: string & tags.Format<"uuid">;
    deleted_at: null;
    code?: { contains: string };
    name?: { contains: string };
  } = {
    job_role_id: jobRoleId,
    deleted_at: null,
  };

  if (body.code !== undefined && body.code !== null) {
    where.code = { contains: body.code };
  }
  if (body.name !== undefined && body.name !== null) {
    where.name = { contains: body.name };
  }

  const orderByField = body.orderBy
    ? body.orderBy.replace(/^[-+]/, "")
    : "created_at";
  const orderDirection =
    body.orderBy && body.orderBy.startsWith("-") ? "desc" : "asc";

  const allowedOrderFields = ["code", "name", "created_at", "updated_at"];
  const orderBy = allowedOrderFields.includes(orderByField)
    ? { [orderByField]: orderDirection }
    : { created_at: "desc" };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_task_groups.findMany({
      where,
      orderBy,
      skip: page * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
      },
    }),
    MyGlobal.prisma.job_performance_eval_task_groups.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((taskGroup) => ({
      id: taskGroup.id,
      name: taskGroup.name,
      code: taskGroup.code,
      description: taskGroup.description ?? null,
    })),
  };
}
