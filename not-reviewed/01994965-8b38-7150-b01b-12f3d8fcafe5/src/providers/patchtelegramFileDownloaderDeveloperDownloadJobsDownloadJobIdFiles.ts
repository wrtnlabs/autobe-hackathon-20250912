import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderFiles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderFiles";
import { IPageITelegramFileDownloaderFiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderFiles";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Retrieve a paginated list of files associated with a specific download job.
 *
 * This function ensures that the authenticated developer owns the download job
 * before accessing its files. It supports filtering by search keywords in
 * filenames and file extensions, sorting by specified fields, and pagination.
 *
 * @param props - An object containing the developer authentication info, the
 *   download job ID, and the request body with pagination and filter options.
 * @param props.developer - Authenticated developer payload to authorize access.
 * @param props.downloadJobId - UUID of the download job whose files are to be
 *   listed.
 * @param props.body - Request body with optional pagination, sorting, and
 *   search filters.
 * @returns A paginated response including metadata about total records and
 *   pages, along with the list of files matching the criteria.
 * @throws {Error} Throws an error if the download job does not belong to the
 *   developer or does not exist.
 */
export async function patchtelegramFileDownloaderDeveloperDownloadJobsDownloadJobIdFiles(props: {
  developer: DeveloperPayload;
  downloadJobId: string & tags.Format<"uuid">;
  body: ITelegramFileDownloaderFiles.IRequest;
}): Promise<IPageITelegramFileDownloaderFiles> {
  const { developer, downloadJobId, body } = props;
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  // Authorization check: developer must own the download job
  const downloadJob =
    await MyGlobal.prisma.telegram_file_downloader_download_jobs.findFirst({
      where: {
        id: downloadJobId,
        developer_id: developer.id,
        deleted_at: null,
      },
      select: { id: true },
    });

  if (!downloadJob) {
    throw new Error("Unauthorized: Download job not found or access denied");
  }

  // Build the where condition for files
  const where: any = {
    download_job_id: downloadJobId,
    deleted_at: null,
  };

  if (body.search !== undefined && body.search !== null) {
    where.OR = [
      { filename: { contains: body.search } },
      { file_extension: { contains: body.search } },
    ];
  }

  // Handle sorting
  const orderBy: any[] = [];
  if (body.sort !== undefined && body.sort !== null) {
    for (const sortItem of body.sort) {
      // Expected format: field:direction (e.g., filename:asc)
      const [field, direction] = sortItem.split(":");
      if (
        [
          "filename",
          "file_size_bytes",
          "created_at",
          "updated_at",
          "file_extension",
        ].includes(field)
      ) {
        orderBy.push({ [field]: direction === "asc" ? "asc" : "desc" });
      }
    }
  }

  // Provide a default order if none found
  if (orderBy.length === 0) {
    orderBy.push({ created_at: "desc" });
  }

  // Fetch data and count concurrently
  const [results, total] = await Promise.all([
    MyGlobal.prisma.telegram_file_downloader_files.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.telegram_file_downloader_files.count({ where }),
  ]);

  // Map results to the output type with date conversion
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      download_job_id: item.download_job_id,
      filename: item.filename,
      file_extension: item.file_extension,
      file_size_bytes: item.file_size_bytes,
      s3_url: item.s3_url,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
