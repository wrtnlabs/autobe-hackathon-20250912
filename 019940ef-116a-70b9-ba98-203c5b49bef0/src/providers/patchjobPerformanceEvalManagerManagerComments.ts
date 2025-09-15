import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IJobPerformanceEvalManagerComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IJobPerformanceEvalManagerComments";
import { IPageIJobPerformanceEvalManagerComments } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIJobPerformanceEvalManagerComments";
import { ManagerPayload } from "../decorators/payload/ManagerPayload";

/**
 * Search and paginate manager comments
 *
 * This operation retrieves a paginated list of manager comments related to
 * employee evaluations. It supports filtering by manager ID, evaluation cycle,
 * keywords in comments, and sorting.
 *
 * Authorization is restricted to users with the manager role.
 *
 * @param props - Object containing manager payload and search request body
 * @param props.manager - Authenticated manager payload
 * @param props.body - Search and filter criteria for manager comments
 * @returns A paginated list of manager comment summaries
 * @throws {Error} Throws error if any unexpected database or logic failure
 *   occurs
 */
export async function patchjobPerformanceEvalManagerManagerComments(props: {
  manager: ManagerPayload;
  body: IJobPerformanceEvalManagerComments.IRequest;
}): Promise<IPageIJobPerformanceEvalManagerComments.ISummary> {
  const { manager, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 100) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.manager_id !== undefined &&
      body.manager_id !== null && {
        manager_id: body.manager_id,
      }),
    ...(body.evaluation_cycle_id !== undefined &&
      body.evaluation_cycle_id !== null && {
        evaluation_cycle_id: body.evaluation_cycle_id,
      }),
    ...(body.comment !== undefined &&
      body.comment !== null && {
        comment: {
          contains: body.comment,
        },
      }),
  };

  let orderBy: { created_at: "desc" | "asc" } | { updated_at: "desc" | "asc" } =
    { created_at: "desc" };

  if (body.orderBy === "created_at_DESC") {
    orderBy = { created_at: "desc" };
  } else if (body.orderBy === "created_at_ASC") {
    orderBy = { created_at: "asc" };
  } else if (body.orderBy === "updated_at_DESC") {
    orderBy = { updated_at: "desc" };
  } else if (body.orderBy === "updated_at_ASC") {
    orderBy = { updated_at: "asc" };
  }

  const [total, records] = await Promise.all([
    MyGlobal.prisma.job_performance_eval_manager_comments.count({ where }),
    MyGlobal.prisma.job_performance_eval_manager_comments.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      comment: item.comment,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
