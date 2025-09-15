import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatuses";
import { IPageITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatuses";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Search and retrieve list of taskManagementTaskStatuses
 *
 * Retrieves a filtered and paginated list of taskManagementTaskStatuses
 * matching optional code and name filters. Supports pagination and sorting.
 * Only accessible to authenticated QA role users.
 *
 * @param props - Object containing QA user payload and request body for filters
 *   and pagination
 * @param props.qa - Authenticated QA user making the request
 * @param props.body - Filtering and pagination controls for
 *   taskManagementTaskStatuses
 * @returns Paginated summary list of taskManagementTaskStatuses matching
 *   criteria
 * @throws Error when database operation fails
 */
export async function patchtaskManagementQaTaskManagementTaskStatuses(props: {
  qa: QaPayload;
  body: ITaskManagementTaskStatuses.IRequest;
}): Promise<IPageITaskManagementTaskStatuses.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  const where = {
    ...(body.code !== undefined &&
      body.code !== null && {
        code: { contains: body.code },
      }),
    ...(body.name !== undefined &&
      body.name !== null && {
        name: { contains: body.name },
      }),
  };

  const orderBy =
    body.orderBy === "code"
      ? { code: "asc" }
      : body.orderBy === "name"
        ? { name: "asc" }
        : { created_at: "desc" };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.task_management_task_statuses.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.task_management_task_statuses.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      code: item.code,
      name: item.name,
      description: item.description ?? null,
    })),
  };
}
