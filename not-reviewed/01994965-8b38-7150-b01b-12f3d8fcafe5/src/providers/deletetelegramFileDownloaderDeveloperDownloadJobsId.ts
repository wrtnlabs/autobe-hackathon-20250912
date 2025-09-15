import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Permanently delete a download job by ID, including all associated data.
 *
 * This operation deletes the download job and cascades to dependent data such
 * as associated files and job queue entries.
 *
 * Only the owning developer may perform this operation.
 *
 * @param props - Object containing the authenticated developer and the job ID
 * @param props.developer - Authenticated developer attempting the deletion
 * @param props.id - UUID of the download job to delete
 * @throws {Error} Throws if the job does not exist or if the developer does not
 *   own the job
 */
export async function deletetelegramFileDownloaderDeveloperDownloadJobsId(props: {
  developer: DeveloperPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const job =
    await MyGlobal.prisma.telegram_file_downloader_download_jobs.findUniqueOrThrow(
      {
        where: { id: props.id },
        select: { id: true, developer_id: true },
      },
    );

  if (job.developer_id !== props.developer.id) {
    throw new Error("Unauthorized: You can only delete your own jobs");
  }

  await MyGlobal.prisma.telegram_file_downloader_download_jobs.delete({
    where: { id: props.id },
  });
}
