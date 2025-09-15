import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderFiles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderFiles";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Add a new file record to a developer's download job.
 *
 * This endpoint creates a new telegram_file_downloader_files record linked to
 * the specified download job. Authorization checks ensure the download job
 * belongs to the developer.
 *
 * @param props - Parameters including authenticated developer, download job ID,
 *   and file creation body.
 * @returns The created file record including metadata and timestamps.
 * @throws {Error} If the download job does not exist.
 * @throws {Error} If the developer does not own the download job.
 */
export async function posttelegramFileDownloaderDeveloperDownloadJobsDownloadJobIdFiles(props: {
  developer: DeveloperPayload;
  downloadJobId: string & tags.Format<"uuid">;
  body: ITelegramFileDownloaderFiles.ICreate;
}): Promise<ITelegramFileDownloaderFiles> {
  const { developer, downloadJobId, body } = props;

  // Find download job by ID
  const downloadJob =
    await MyGlobal.prisma.telegram_file_downloader_download_jobs.findUnique({
      where: { id: downloadJobId },
    });

  if (!downloadJob) {
    throw new Error("Download job not found");
  }

  // Authorization: check that developer owns the download job
  if (downloadJob.developer_id !== developer.id) {
    throw new Error("Unauthorized: You do not own this download job");
  }

  // Generate new UUID for file ID
  const newFileId = v4() as string & tags.Format<"uuid">;

  // Convert dates to ISO strings safely
  const createdAt = toISOStringSafe(body.created_at);
  const updatedAt = toISOStringSafe(body.updated_at);

  // Create the new file record
  const newFile = await MyGlobal.prisma.telegram_file_downloader_files.create({
    data: {
      id: newFileId,
      download_job_id: body.download_job_id,
      filename: body.filename,
      file_extension: body.file_extension,
      file_size_bytes: body.file_size_bytes,
      s3_url: body.s3_url,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: body.deleted_at ?? null,
    },
  });

  // Return converted record
  return {
    id: newFile.id,
    download_job_id: newFile.download_job_id,
    filename: newFile.filename,
    file_extension: newFile.file_extension,
    file_size_bytes: newFile.file_size_bytes,
    s3_url: newFile.s3_url,
    created_at: toISOStringSafe(newFile.created_at),
    updated_at: toISOStringSafe(newFile.updated_at),
    deleted_at: newFile.deleted_at ? toISOStringSafe(newFile.deleted_at) : null,
  };
}
