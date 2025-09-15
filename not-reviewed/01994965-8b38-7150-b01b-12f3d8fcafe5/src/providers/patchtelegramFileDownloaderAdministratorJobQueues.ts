import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderJobQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderJobQueue";
import { IPageITelegramFileDownloaderJobQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderJobQueue";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchtelegramFileDownloaderAdministratorJobQueues(props: {
  administrator: AdministratorPayload;
  body: ITelegramFileDownloaderJobQueue.IRequest;
}): Promise<IPageITelegramFileDownloaderJobQueue.ISummary> {
  const { administrator, body } = props;

  // Extract pagination with defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Validate order_by and order_direction
  const allowedSortFields = ["created_at", "updated_at", "priority"];
  const orderByField =
    body.order_by && allowedSortFields.includes(body.order_by)
      ? body.order_by
      : "created_at";

  const orderDirection = body.order_direction === "asc" ? "asc" : "desc";

  // Build where clause
  const where = {
    deleted_at: null,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.priority !== undefined &&
      body.priority !== null && { priority: body.priority }),
    ...((body.min_retries !== undefined && body.min_retries !== null) ||
    (body.max_retries !== undefined && body.max_retries !== null)
      ? {
          retries: {
            ...(body.min_retries !== undefined &&
              body.min_retries !== null && { gte: body.min_retries }),
            ...(body.max_retries !== undefined &&
              body.max_retries !== null && { lte: body.max_retries }),
          },
        }
      : {}),
    ...(body.last_error_message_contains !== undefined &&
      body.last_error_message_contains !== null && {
        last_error_message: {
          contains: body.last_error_message_contains,
        },
      }),
  };

  // Perform concurrent fetch and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.telegram_file_downloader_job_queues.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.telegram_file_downloader_job_queues.count({ where }),
  ]);

  // Map to API DTO
  const data = rows.map((job) => ({
    id: job.id,
    job_id: job.job_id,
    status: job.status,
    priority: job.priority,
    retries: job.retries,
    last_error_message: job.last_error_message ?? undefined,
    created_at: toISOStringSafe(job.created_at),
    updated_at: toISOStringSafe(job.updated_at),
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
