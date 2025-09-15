import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Permanently delete a file associated with a download job.
 *
 * This operation deletes a downloaded file record from the
 * telegram_file_downloader_files table based on the provided download job ID
 * and file ID. It performs a hard delete, permanently removing the file and its
 * metadata from the system.
 *
 * Authorization: Only accessible by administrators with proper credentials.
 *
 * @param props - Object containing administrator info, downloadJobId, and file
 *   id
 * @param props.administrator - The authenticated administrator performing the
 *   deletion
 * @param props.downloadJobId - UUID of the download job containing the file
 * @param props.id - UUID of the file to delete
 * @throws {Error} Throws if the file does not exist or does not belong to the
 *   specified download job
 */
export async function deletetelegramFileDownloaderAdministratorDownloadJobsDownloadJobIdFilesId(props: {
  administrator: AdministratorPayload;
  downloadJobId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { administrator, downloadJobId, id } = props;

  // Check that the file exists and belongs to the download job
  const file = await MyGlobal.prisma.telegram_file_downloader_files.findFirst({
    where: {
      id,
      download_job_id: downloadJobId,
    },
  });

  if (!file) {
    throw new Error(
      "File not found or does not belong to the specified download job",
    );
  }

  // Perform hard delete
  await MyGlobal.prisma.telegram_file_downloader_files.delete({
    where: { id },
  });
}
