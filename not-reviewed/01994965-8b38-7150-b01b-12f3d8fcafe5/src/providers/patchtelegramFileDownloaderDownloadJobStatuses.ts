import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderDownloadJobStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJobStatus";
import { IPageITelegramFileDownloaderDownloadJobStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderDownloadJobStatus";

/**
 * List download job statuses with pagination and filters
 *
 * Retrieves a paginated list of download job statuses from the
 * telegram_file_downloader_download_job_statuses table. Supports filtering by
 * search term (applied to status_code and description) and exact status_code.
 * Returns status codes representing different states in the download job
 * lifecycle.
 *
 * This is a public, read-only operation requiring no authentication.
 *
 * @param props - Object containing the request body with pagination and
 *   filtering parameters
 * @param props.body - Request body including page, limit, search, and
 *   status_code filters
 * @returns A paginated list of download job statuses with pagination metadata
 * @throws {Error} When database access fails or parameters are invalid
 */
export async function patchtelegramFileDownloaderDownloadJobStatuses(props: {
  body: ITelegramFileDownloaderDownloadJobStatus.IRequest;
}): Promise<IPageITelegramFileDownloaderDownloadJobStatus> {
  const { body } = props;

  const page =
    body.page ?? (1 as number & tags.Type<"int32"> & tags.Minimum<0>);
  const limit =
    body.limit ?? (10 as number & tags.Type<"int32"> & tags.Minimum<0>);
  const skip = (page - 1) * limit;

  const where: {
    OR?:
      | { status_code: { contains: string } }
      | { description: { contains: string } }[];
    status_code?: string;
  } = {};

  if (body.search !== undefined) {
    where.OR = [
      { status_code: { contains: body.search } },
      { description: { contains: body.search } },
    ];
  }

  if (body.status_code !== undefined) {
    where.status_code = body.status_code;
  }

  const [total, results] = await Promise.all([
    MyGlobal.prisma.telegram_file_downloader_download_job_statuses.count({
      where,
    }),
    MyGlobal.prisma.telegram_file_downloader_download_job_statuses.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
    data: results.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      status_code: item.status_code,
      description: item.description,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
