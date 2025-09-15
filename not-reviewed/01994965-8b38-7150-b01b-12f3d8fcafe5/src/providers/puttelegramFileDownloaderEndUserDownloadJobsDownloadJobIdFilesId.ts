import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderFiles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderFiles";
import { EnduserPayload } from "../decorators/payload/EnduserPayload";

/**
 * Modify file metadata and signed URL for a download job file.
 *
 * Updates an existing file record linked to a download job. Only authorized end
 * users who own the download job can perform this update.
 *
 * @param props - Parameters including authenticated endUser, downloadJobId,
 *   file id, and update body
 * @returns Updated file record
 * @throws {Error} When unauthorized or not found
 */
export async function puttelegramFileDownloaderEndUserDownloadJobsDownloadJobIdFilesId(props: {
  endUser: EnduserPayload;
  downloadJobId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
  body: ITelegramFileDownloaderFiles.IUpdate;
}): Promise<ITelegramFileDownloaderFiles> {
  const { endUser, downloadJobId, id, body } = props;

  // Verify ownership of download job
  const downloadJob =
    await MyGlobal.prisma.telegram_file_downloader_download_jobs.findUnique({
      where: { id: downloadJobId },
    });

  if (!downloadJob || downloadJob.enduser_id !== endUser.id) {
    throw new Error("Unauthorized or download job not found");
  }

  // Verify the file belongs to the download job
  const file = await MyGlobal.prisma.telegram_file_downloader_files.findUnique({
    where: { id },
  });

  if (!file || file.download_job_id !== downloadJobId) {
    throw new Error("File not found or does not belong to the download job");
  }

  // Prepare updated fields
  const updates: ITelegramFileDownloaderFiles.IUpdate = {
    download_job_id: body.download_job_id ?? undefined,
    filename: body.filename ?? undefined,
    file_extension: body.file_extension ?? undefined,
    file_size_bytes: body.file_size_bytes ?? undefined,
    s3_url: body.s3_url ?? undefined,
    created_at: body.created_at ?? undefined,
    updated_at: undefined, // Will be set to current timestamp
    deleted_at:
      body.deleted_at === null ? null : (body.deleted_at ?? undefined),
  };

  // Set updated_at to current timestamp
  const updatedAt = toISOStringSafe(new Date());

  // Update in DB
  const updated = await MyGlobal.prisma.telegram_file_downloader_files.update({
    where: { id },
    data: {
      ...updates,
      updated_at: updatedAt,
    },
  });

  // Return result with proper Date string conversions
  return {
    id: updated.id as string & tags.Format<"uuid">,
    download_job_id: updated.download_job_id as string & tags.Format<"uuid">,
    filename: updated.filename,
    file_extension: updated.file_extension,
    file_size_bytes: updated.file_size_bytes,
    s3_url: updated.s3_url,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
