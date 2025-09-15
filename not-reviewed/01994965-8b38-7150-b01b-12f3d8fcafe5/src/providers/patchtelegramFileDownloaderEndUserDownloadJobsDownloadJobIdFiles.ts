import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderFiles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderFiles";
import { IPageITelegramFileDownloaderFiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderFiles";
import { EnduserPayload } from "../decorators/payload/EnduserPayload";

/**
 * Retrieves a paginated list of files associated with a specific download job.
 *
 * This endpoint verifies that the requesting end user owns the download job
 * before returning the list of associated files. Supports filtering by search
 * keyword, sorting by multiple fields, and pagination.
 *
 * @param props - Object containing the authenticated end user, download job ID,
 *   and filtering/pagination parameters.
 * @param props.endUser - Authenticated end user performing the request.
 * @param props.downloadJobId - UUID of the download job to query files from.
 * @param props.body - Request body containing pagination, sorting, and search
 *   parameters.
 * @returns A paginated list of file metadata associated with the download job.
 * @throws {Error} If the download job does not exist or is not owned by the end
 *   user.
 * @throws {Error} For any database access issues.
 */
export async function patchtelegramFileDownloaderEndUserDownloadJobsDownloadJobIdFiles(props: {
  endUser: EnduserPayload;
  downloadJobId: string & tags.Format<"uuid">;
  body: ITelegramFileDownloaderFiles.IRequest;
}): Promise<IPageITelegramFileDownloaderFiles> {
  const { endUser, downloadJobId, body } = props;

  const downloadJob =
    await MyGlobal.prisma.telegram_file_downloader_download_jobs.findUnique({
      where: { id: downloadJobId },
    });

  if (!downloadJob || downloadJob.enduser_id !== endUser.id) {
    throw new Error("Unauthorized or download job not found");
  }

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  const orderByArray = (body.sort ?? []).map((sortItem) => {
    const [field, direction] = sortItem.split(":");
    return {
      [field]: direction === "asc" ? "asc" : "desc",
    };
  });

  if (orderByArray.length === 0) {
    orderByArray.push({ created_at: "desc" });
  }

  const whereClause = {
    download_job_id: downloadJobId,
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null && {
        filename: { contains: body.search },
      }),
  };

  const skip = (page - 1) * limit;

  const [files, total] = await Promise.all([
    MyGlobal.prisma.telegram_file_downloader_files.findMany({
      where: whereClause,
      orderBy: orderByArray,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.telegram_file_downloader_files.count({
      where: whereClause,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: files.map((file) => ({
      id: file.id,
      download_job_id: file.download_job_id,
      filename: file.filename,
      file_extension: file.file_extension,
      file_size_bytes: file.file_size_bytes,
      s3_url: file.s3_url,
      created_at: toISOStringSafe(file.created_at),
      updated_at: toISOStringSafe(file.updated_at),
      deleted_at: file.deleted_at ? toISOStringSafe(file.deleted_at) : null,
    })),
  };
}
