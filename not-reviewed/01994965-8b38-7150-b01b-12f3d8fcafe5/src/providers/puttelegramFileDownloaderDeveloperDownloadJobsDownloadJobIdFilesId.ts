import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderFiles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderFiles";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Update metadata for an existing file associated with a download job.
 *
 * This operation allows modification of metadata such as filename, extension,
 * file size in bytes, and the signed AWS S3 URL for secure access.
 *
 * Only a developer owning the download job may perform the update.
 *
 * @param props - Properties containing developer authentication, download job
 *   ID, file ID, and update data.
 * @param props.developer - Authenticated developer performing the update.
 * @param props.downloadJobId - UUID of the download job the file is linked to.
 * @param props.id - UUID of the file to update.
 * @param props.body - Partial object with file metadata to update.
 * @returns Updated file record.
 * @throws {Error} If the download job doesn't exist or is not owned by
 *   developer.
 * @throws {Error} If the file does not exist linked to the specified download
 *   job.
 */
export async function puttelegramFileDownloaderDeveloperDownloadJobsDownloadJobIdFilesId(props: {
  developer: DeveloperPayload;
  downloadJobId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
  body: ITelegramFileDownloaderFiles.IUpdate;
}): Promise<ITelegramFileDownloaderFiles> {
  const { developer, downloadJobId, id, body } = props;

  // Verify the download job exists and is owned by the developer
  const downloadJob =
    await MyGlobal.prisma.telegram_file_downloader_download_jobs.findFirst({
      where: { id: downloadJobId, developer_id: developer.id },
    });

  if (!downloadJob) {
    throw new Error("Unauthorized or download job not found");
  }

  // Verify the file exists under this download job
  const file = await MyGlobal.prisma.telegram_file_downloader_files.findFirst({
    where: { id, download_job_id: downloadJobId },
  });

  if (!file) {
    throw new Error("File not found for the given download job");
  }

  // Update the file record with provided fields
  const updated = await MyGlobal.prisma.telegram_file_downloader_files.update({
    where: { id },
    data: {
      filename: body.filename ?? undefined,
      file_extension: body.file_extension ?? undefined,
      file_size_bytes: body.file_size_bytes ?? undefined,
      s3_url: body.s3_url ?? undefined,
      created_at: body.created_at
        ? toISOStringSafe(body.created_at)
        : undefined,
      updated_at: body.updated_at
        ? toISOStringSafe(body.updated_at)
        : undefined,
      deleted_at:
        body.deleted_at !== undefined
          ? body.deleted_at === null
            ? null
            : toISOStringSafe(body.deleted_at)
          : undefined,
    },
  });

  return {
    id: updated.id,
    download_job_id: updated.download_job_id,
    filename: updated.filename,
    file_extension: updated.file_extension,
    file_size_bytes: updated.file_size_bytes,
    s3_url: updated.s3_url,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
