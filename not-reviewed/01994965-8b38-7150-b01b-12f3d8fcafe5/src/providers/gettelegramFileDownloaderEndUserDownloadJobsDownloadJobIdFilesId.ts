import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderFiles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderFiles";
import { EnduserPayload } from "../decorators/payload/EnduserPayload";

/**
 * Get detailed info and signed URL for a specific file associated with a
 * download job.
 *
 * This function retrieves metadata for a file identified by its unique ID and
 * the download job ID, ensuring the requesting end user owns the download job.
 *
 * Authorization is enforced by verifying the download job's ownership.
 *
 * @param props - The input parameters containing:
 *
 *   - EndUser: The authenticated endUser payload with user ID.
 *   - DownloadJobId: UUID of the download job.
 *   - Id: UUID of the file.
 *
 * @returns The detailed file information including file name, extension, size,
 *   and signed URL.
 * @throws {Error} Throws when the download job is not found or not owned by the
 *   user.
 * @throws {Error} Throws when the file is not found or does not belong to the
 *   specified download job.
 */
export async function gettelegramFileDownloaderEndUserDownloadJobsDownloadJobIdFilesId(props: {
  endUser: EnduserPayload;
  downloadJobId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<ITelegramFileDownloaderFiles> {
  const { endUser, downloadJobId, id } = props;

  // Verify download job ownership
  const downloadJob =
    await MyGlobal.prisma.telegram_file_downloader_download_jobs.findUniqueOrThrow(
      {
        where: { id: downloadJobId },
      },
    );
  if (downloadJob.enduser_id !== endUser.id) {
    throw new Error("Unauthorized: You do not own this download job");
  }

  // Find the file ensuring it belongs to the download job
  const file = await MyGlobal.prisma.telegram_file_downloader_files.findFirst({
    where: { id, download_job_id: downloadJobId },
  });
  if (!file) {
    throw new Error("File not found");
  }

  // Return with DateTime fields converted using toISOStringSafe
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
