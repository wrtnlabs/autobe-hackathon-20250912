import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { EnduserPayload } from "../decorators/payload/EnduserPayload";

/**
 * Permanently deletes a download job by its unique ID along with all associated
 * files and job queue entries.
 *
 * This operation enforces ownership authorization, allowing only the job owner
 * (end user or developer) to delete the job.
 *
 * @param props - Object containing the authenticated end user payload and the
 *   UUID of the download job to delete
 * @param props.endUser - Authenticated end user performing the deletion
 * @param props.id - UUID of the download job to be permanently deleted
 * @returns Void
 * @throws {Error} Throws error if the download job is not found or if the
 *   authenticated user is not the owner
 */
export async function deletetelegramFileDownloaderEndUserDownloadJobsId(props: {
  endUser: EnduserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { endUser, id } = props;

  const downloadJob =
    await MyGlobal.prisma.telegram_file_downloader_download_jobs.findUnique({
      where: { id },
      select: {
        id: true,
        enduser_id: true,
        developer_id: true,
      },
    });

  if (!downloadJob) {
    throw new Error("Download job not found");
  }

  if (
    downloadJob.enduser_id !== endUser.id &&
    downloadJob.developer_id !== endUser.id
  ) {
    throw new Error("Unauthorized: You do not own this download job");
  }

  await MyGlobal.prisma.telegram_file_downloader_files.deleteMany({
    where: { download_job_id: id },
  });

  await MyGlobal.prisma.telegram_file_downloader_job_queues.deleteMany({
    where: { job_id: id },
  });

  await MyGlobal.prisma.telegram_file_downloader_download_jobs.delete({
    where: { id },
  });
}
