import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalKnowledgeArea } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalKnowledgeArea";
import { IPageIJobPerformanceEvalKnowledgeArea } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalKnowledgeArea";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";

/**
 * Search and retrieve a filtered, paginated list of knowledge areas
 *
 * This operation returns a paginated summary of knowledge areas filtered by
 * optional code and name strings. It supports pagination parameters and sorting
 * options to customize the returned dataset.
 *
 * @param props - Object containing the authenticated employee and request body
 * @param props.employee - Authenticated employee performing the request
 * @param props.body - Request body containing filters, pagination and sorting
 * @returns Paginated summary list of knowledge areas
 * @throws {Error} When database query fails
 */
export async function patchjobPerformanceEvalEmployeeKnowledgeAreas(props: {
  employee: EmployeePayload;
  body: IJobPerformanceEvalKnowledgeArea.IRequest;
}): Promise<IPageIJobPerformanceEvalKnowledgeArea.ISummary> {
  const { employee, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where = {
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
    MyGlobal.prisma.job_performance_eval_knowledge_areas.findMany({
      where,
      orderBy:
        body.orderBy &&
        ["id", "code", "name", "created_at", "updated_at"].includes(
          body.orderBy,
        )
          ? { [body.orderBy]: body.orderDirection === "asc" ? "asc" : "desc" }
          : { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
      },
    }),
    MyGlobal.prisma.job_performance_eval_knowledge_areas.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
    })),
  };
}
