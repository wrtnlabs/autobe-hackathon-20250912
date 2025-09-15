import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderDownloadJobs } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJobs";
import { IPageITelegramFileDownloaderDownloadJobs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderDownloadJobs";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve paginated list of download job requests with filters
 *
 * This operation searches and retrieves download jobs filtered by status, date
 * range, channel_id and user scope. Supports pagination and sorting by
 * created_at or updated_at timestamps. Only active (non-deleted) jobs are
 * included.
 *
 * @param props - Object containing the authenticated administrator and the
 *   filter/pagination request body
 * @param props.administrator - Authenticated administrator performing the query
 * @param props.body - Filtering and pagination parameters for download jobs
 * @returns Paginated list of download job summaries matching the search
 *   criteria
 * @throws Error if any error occurs during DB access
 */
export async function patchtelegramFileDownloaderAdministratorDownloadJobs(props: {
  administrator: AdministratorPayload;
  body: ITelegramFileDownloaderDownloadJobs.IRequest;
}): Promise<IPageITelegramFileDownloaderDownloadJobs.ISummary> {
  const { administrator, body } = props;

  // Default pagination values
  const page = (body.page ?? 1) as number & tags.Type<"int32">;
  const limit = (body.limit ?? 10) as number & tags.Type<"int32">;
  const skip = (page - 1) * limit;

  // Build Prisma where clause with safe null/undefined checks
  const where = {
    deleted_at: null,
    ...(body.enduser_id !== undefined &&
      body.enduser_id !== null && { enduser_id: body.enduser_id }),
    ...(body.developer_id !== undefined &&
      body.developer_id !== null && { developer_id: body.developer_id }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.channel_id !== undefined &&
      body.channel_id !== null && { channel_id: body.channel_id }),
    ...((body.created_after !== undefined && body.created_after !== null) ||
    (body.created_before !== undefined && body.created_before !== null)
      ? {
          created_at: {
            ...(body.created_after !== undefined && body.created_after !== null
              ? { gte: body.created_after }
              : {}),
            ...(body.created_before !== undefined &&
            body.created_before !== null
              ? { lte: body.created_before }
              : {}),
          },
        }
      : {}),
  };

  // Determine orderBy
  const orderBy =
    body.order_by === "updated_at"
      ? { updated_at: "desc" }
      : { created_at: "desc" };

  // Retrieve records and count
  const [jobs, total] = await Promise.all([
    MyGlobal.prisma.telegram_file_downloader_download_jobs.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        channel_id: true,
        status: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.telegram_file_downloader_download_jobs.count({ where }),
  ]);

  // Map each job to summary DTO
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: jobs.map((job) => ({
      id: job.id as string & tags.Format<"uuid">,
      channel_id: job.channel_id,
      status: job.status,
      created_at: toISOStringSafe(job.created_at),
    })),
  };
}
