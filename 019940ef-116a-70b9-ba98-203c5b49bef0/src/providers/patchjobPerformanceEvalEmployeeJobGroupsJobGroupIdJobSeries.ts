import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobSeries";
import { IPageIJobPerformanceEvalJobSeries } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalJobSeries";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * List and search job series within a specific job group.
 *
 * Retrieves a filtered and paginated list of job series entries under the job
 * group identified by the given jobGroupId. Supports filtering by code, name,
 * and description with partial matches. Allows sorting by code, name, or
 * creation date, with pagination controls.
 *
 * Authorization is ensured by requiring an authenticated employee.
 *
 * @param props - Object containing the authenticated employee, the target
 *   jobGroupId, and filtering pagination criteria in body.
 * @param props.employee - The authenticated employee payload.
 * @param props.jobGroupId - UUID of the job group to list job series from.
 * @param props.body - Request body containing filters and pagination data.
 * @returns A paginated summary list of job series matching the criteria.
 * @throws {Error} For database errors or unexpected failures.
 */
export async function patchjobPerformanceEvalEmployeeJobGroupsJobGroupIdJobSeries(props: {
  employee: EmployeePayload;
  jobGroupId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalJobSeries.IRequest;
}): Promise<IPageIJobPerformanceEvalJobSeries.ISummary> {
  const { employee, jobGroupId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const whereClause: {
    job_group_id: string & tags.Format<"uuid">;
    deleted_at: null;
    code?: {
      contains: string;
    };
    name?: {
      contains: string;
    };
    description?: {
      contains: string;
    };
  } = {
    job_group_id: jobGroupId,
    deleted_at: null,
  };

  if (body.code !== undefined && body.code !== null) {
    whereClause.code = { contains: body.code };
  }
  if (body.name !== undefined && body.name !== null) {
    whereClause.name = { contains: body.name };
  }
  if (body.description !== undefined && body.description !== null) {
    whereClause.description = { contains: body.description };
  }

  let orderByClause: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.orderBy) {
    let direction: "asc" | "desc" = "asc";
    let orderField = body.orderBy;
    if (orderField.startsWith("-")) {
      direction = "desc";
      orderField = orderField.substring(1);
    }
    if (["code", "name", "created_at"].includes(orderField)) {
      orderByClause = { [orderField]: direction };
    }
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_job_series.findMany({
      where: whereClause,
      orderBy: orderByClause,
      skip,
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.job_performance_eval_job_series.count({
      where: whereClause,
    }),
  ]);

  const data: IJobPerformanceEvalJobSeries.ISummary[] = results.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description ?? null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
