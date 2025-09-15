import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { INotificationWorkflowWorkerService } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowWorkerService";
import { IPageINotificationWorkflowWorkerservice } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageINotificationWorkflowWorkerservice";

/**
 * Searches and retrieves a filtered, paginated list of WorkerService accounts.
 *
 * This public operation allows filtering by email addresses (partial match),
 * supports pagination with page number and limit, and returns summary
 * information including id, email, and timestamps.
 *
 * @param props - Object containing the search criteria and pagination controls.
 * @param props.body - The body with optional email filter and pagination
 *   parameters.
 * @returns A paginated summary of WorkerService accounts matching the filter.
 * @throws {Error} Throws error if database operation fails.
 */
export async function patchnotificationWorkflowWorkerServices(props: {
  body: INotificationWorkflowWorkerService.IRequest;
}): Promise<IPageINotificationWorkflowWorkerservice.ISummary> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  const whereCondition = {
    ...(body.email !== undefined &&
      body.email !== null && {
        email: { contains: body.email },
      }),
  };

  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    MyGlobal.prisma.notification_workflow_workerservices.findMany({
      where: whereCondition,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: { id: true, email: true, created_at: true, updated_at: true },
    }),
    MyGlobal.prisma.notification_workflow_workerservices.count({
      where: whereCondition,
    }),
  ]);

  const data = results.map((item) => ({
    id: item.id as string & tags.Format<"uuid">,
    email: item.email,
    created_at: item.created_at ? toISOStringSafe(item.created_at) : undefined,
    updated_at: item.updated_at ? toISOStringSafe(item.updated_at) : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
