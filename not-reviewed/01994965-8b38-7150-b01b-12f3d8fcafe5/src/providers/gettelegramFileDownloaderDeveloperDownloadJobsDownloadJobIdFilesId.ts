import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderFiles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderFiles";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Get detailed info and signed URL for a specific file
 *
 * Retrieves detailed information about a file associated with a download job.
 * Ensures that the requesting developer owns the download job to enforce
 * authorization. Returns file metadata including filename, extension, size,
 * signed S3 URL, and timestamps.
 *
 * @param props - Parameters including authenticated developer and identifiers
 * @param props.developer - Authenticated developer user performing the request
 * @param props.downloadJobId - UUID of the download job
 * @param props.id - UUID of the specific file
 * @returns Detailed file information with signed URL
 * @throws {Error} When the download job does not exist or the developer lacks
 *   access
 * @throws {Error} When the file does not exist or is deleted
 */
export async function gettelegramFileDownloaderDeveloperDownloadJobsDownloadJobIdFilesId(props: {
  developer: DeveloperPayload;
  downloadJobId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<ITelegramFileDownloaderFiles> {
  const { developer, downloadJobId, id } = props;

  const downloadJob =
    await MyGlobal.prisma.telegram_file_downloader_download_jobs.findFirst({
      where: {
        id: downloadJobId,
        developer_id: developer.id,
        deleted_at: null,
      },
    });
  if (!downloadJob) {
    throw new Error("Download job not found or unauthorized");
  }

  const file = await MyGlobal.prisma.telegram_file_downloader_files.findFirst({
    where: {
      id: id,
      download_job_id: downloadJobId,
      deleted_at: null,
    },
  });

  if (!file) {
    throw new Error("File not found");
  }

  return {
    id: file.id,
    download_job_id: file.download_job_id,
    filename: file.filename,
    file_extension: file.file_extension,
    file_size_bytes: file.file_size_bytes,
    s3_url: file.s3_url,
    created_at: toISOStringSafe(file.created_at),
    updated_at: toISOStringSafe(file.updated_at),
    deleted_at: file.deleted_at ? toISOStringSafe(file.deleted_at) : null,
  };
}
