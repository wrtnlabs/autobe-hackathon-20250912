import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTaskStatuses";
import { IPageITaskManagementTaskStatuses } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTaskStatuses";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Search and retrieve list of taskManagementTaskStatuses
 *
 * Retrieves a paginated list of taskManagementTaskStatuses from the database
 * with optional filtering by code and name, supporting pagination and ordering
 * by code or name.
 *
 * This operation requires TPM role authorization.
 *
 * @param props - Object containing tpm authentication and request body
 * @param props.tpm - TPM authenticated user payload
 * @param props.body - Task status search and pagination criteria
 * @returns Paginated summary list of taskManagementTaskStatuses
 * @throws {Error} When database operation fails or invalid parameters provided
 */
export async function patchtaskManagementTpmTaskManagementTaskStatuses(props: {
  tpm: TpmPayload;
  body: ITaskManagementTaskStatuses.IRequest;
}): Promise<IPageITaskManagementTaskStatuses.ISummary> {
  const { tpm, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const whereConditions = {
    ...(body.code !== undefined &&
      body.code !== null && { code: { contains: body.code } }),
    ...(body.name !== undefined &&
      body.name !== null && { name: { contains: body.name } }),
  };

  const orderByField = body.orderBy === "name" ? "name" : "code";

  const [results, total] = await Promise.all([
    MyGlobal.prisma.task_management_task_statuses.findMany({
      where: whereConditions,
      orderBy: { [orderByField]: "asc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.task_management_task_statuses.count({
      where: whereConditions,
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
      description: r.description ?? null,
    })),
  };
}
