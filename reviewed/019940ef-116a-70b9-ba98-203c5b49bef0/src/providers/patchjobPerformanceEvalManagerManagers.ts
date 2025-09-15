import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManager";
import { IPageIJobPerformanceEvalManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalManager";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Search and retrieve a paginated list of manager users from the
 * job_performance_eval_managers table.
 *
 * Supports filtering by search term on manager name, pagination, and sorting.
 *
 * @param props - Object containing authorized manager payload and request body
 *   with filters
 * @returns Paginated summary information of matching managers
 * @throws {Error} If any unexpected database or runtime error occurs
 */
export async function patchjobPerformanceEvalManagerManagers(props: {
  manager: ManagerPayload;
  body: IJobPerformanceEvalManager.IRequest;
}): Promise<IPageIJobPerformanceEvalManager.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: {
    deleted_at: null;
    name?: {
      contains: string;
    };
  } = {
    deleted_at: null,
  };

  if (body.search !== undefined && body.search !== null) {
    where.name = { contains: body.search };
  }

  const orderBy: {
    name?: "asc" | "desc";
    created_at?: "asc" | "desc";
  } = {};

  switch (body.sort) {
    case "name_asc":
      orderBy.name = "asc";
      break;
    case "name_desc":
      orderBy.name = "desc";
      break;
    default:
      orderBy.created_at = "desc";
  }

  const [managers, total] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_managers.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.job_performance_eval_managers.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
    data: managers.map(({ id, name }) => ({
      id: id,
      name: name,
    })),
  };
}
