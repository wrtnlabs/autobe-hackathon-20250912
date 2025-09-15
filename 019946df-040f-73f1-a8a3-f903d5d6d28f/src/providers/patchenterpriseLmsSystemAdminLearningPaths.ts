import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsLearningPath } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPath";
import { IPageIEnterpriseLmsLearningPath } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsLearningPath";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve enterprise learning paths
 *
 * Retrieves a filtered and paginated list of enterprise learning paths. Applies
 * soft delete filtering, status filtering, search term filtering by code or
 * title, and sorting based on orderBy and orderDirection.
 *
 * Authorization: Only authenticated systemAdmin users can access this endpoint.
 *
 * @param props - Object containing systemAdmin payload and request body
 * @param props.systemAdmin - The authenticated systemAdmin user payload
 * @param props.body - The request body containing filtering, pagination, and
 *   sorting
 * @returns Paginated summaries of learning paths matching filters
 * @throws {Error} If pagination or sorting parameters are invalid
 */
export async function patchenterpriseLmsSystemAdminLearningPaths(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsLearningPath.IRequest;
}): Promise<IPageIEnterpriseLmsLearningPath.ISummary> {
  const { systemAdmin, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 100;

  if (page <= 0) throw new Error("Page must be positive");
  if (limit <= 0) throw new Error("Limit must be positive");

  const where: {
    deleted_at: null;
    status?: string;
    OR?: { code?: { contains: string }; title?: { contains: string } }[];
  } = {
    deleted_at: null,
  };

  if (body.status !== undefined && body.status !== null) {
    where.status = body.status;
  }

  if (body.search !== undefined && body.search !== null) {
    where.OR = [
      { code: { contains: body.search } },
      { title: { contains: body.search } },
    ];
  }

  const allowedOrderBy = new Set(["code", "title", "created_at", "updated_at"]);
  const orderByField = body.orderBy ?? "created_at";
  if (!allowedOrderBy.has(orderByField)) {
    throw new Error(`orderBy must be one of ${[...allowedOrderBy].join(", ")}`);
  }

  const allowedOrderDirection = new Set(["asc", "desc"]);
  const orderDirection = body.orderDirection ?? "desc";
  if (!allowedOrderDirection.has(orderDirection)) {
    throw new Error(
      `orderDirection must be one of ${[...allowedOrderDirection].join(", ")}`,
    );
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_learning_paths.findMany({
      where,
      select: {
        id: true,
        code: true,
        title: true,
        status: true,
      },
      orderBy: {
        [orderByField]: orderDirection,
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_learning_paths.count({ where }),
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
      title: item.title,
      status: item.status,
    })),
  };
}
