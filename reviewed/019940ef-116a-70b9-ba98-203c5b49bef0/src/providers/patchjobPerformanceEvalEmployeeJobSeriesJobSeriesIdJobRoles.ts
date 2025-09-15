import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalJobRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalJobRole";
import { IPageIJobPerformanceEvalJobRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalJobRole";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Search and list job roles within a job series with pagination and filtering.
 *
 * This PATCH operation retrieves paginated job roles filtered by jobSeriesId,
 * with optional filters for code, name, and sorting capability. Only roles not
 * marked as deleted (deleted_at = null) are returned.
 *
 * @param props - Object containing employee authentication, jobSeriesId path
 *   param, and request body filters
 * @param props.employee - Authenticated employee making the request
 * @param props.jobSeriesId - UUID of the job series to filter job roles
 * @param props.body - Filter and pagination options for job roles
 * @returns Paginated list of job role summaries matching search criteria
 * @throws {Error} When database query fails or unexpected conditions occur
 */
export async function patchjobPerformanceEvalEmployeeJobSeriesJobSeriesIdJobRoles(props: {
  employee: EmployeePayload;
  jobSeriesId: string & tags.Format<"uuid">;
  body: IJobPerformanceEvalJobRole.IRequest;
}): Promise<IPageIJobPerformanceEvalJobRole.ISummary> {
  const { employee, jobSeriesId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where: {
    job_series_id: string & tags.Format<"uuid">;
    deleted_at: null;
    code?: { contains: string };
    name?: { contains: string };
  } = {
    job_series_id: jobSeriesId,
    deleted_at: null,
  };

  if (body.code !== undefined && body.code !== null && body.code !== "") {
    where.code = { contains: body.code };
  }

  if (body.name !== undefined && body.name !== null && body.name !== "") {
    where.name = { contains: body.name };
  }

  const orderByCondition = () => {
    if (!body.order_by) return { created_at: "desc" };
    const [field, direction] = body.order_by.split("_");
    const dir = direction && direction.toLowerCase() === "asc" ? "asc" : "desc";
    if (["code", "name", "created_at", "updated_at"].includes(field)) {
      return { [field]: dir };
    }
    return { created_at: "desc" };
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_job_roles.findMany({
      where,
      orderBy: orderByCondition(),
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        growth_level: true,
      },
    }),
    MyGlobal.prisma.job_performance_eval_job_roles.count({ where }),
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
      name: r.name,
      code: r.code,
      description: r.description ?? undefined,
      growth_level: r.growth_level ?? undefined,
    })),
  };
}
