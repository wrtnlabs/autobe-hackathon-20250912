import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatuses";
import { IPageITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatuses";
import { PmPayload } from "../decorators/payload/PmPayload";

/**
 * Search and retrieve list of taskManagementTaskStatuses
 *
 * Retrieves a paginated list of taskManagementTaskStatuses filtered by code and
 * name. Supports pagination and ordering.
 *
 * @param props - Object containing authentication and request body
 * @param props.pm - Authenticated PM user making the request
 * @param props.body - Request body with filter and pagination criteria
 * @returns A paginated summary list of task statuses
 * @throws {Error} Throws if any database or internal error occurs
 */
export async function patchtaskManagementPmTaskManagementTaskStatuses(props: {
  pm: PmPayload;
  body: ITaskManagementTaskStatuses.IRequest;
}): Promise<IPageITaskManagementTaskStatuses.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

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

  const orderBy = body.orderBy
    ? { [body.orderBy]: "asc" }
    : { created_at: "desc" };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.task_management_task_statuses.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
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
