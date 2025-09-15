import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderFiles } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderFiles";
import { EnduserPayload } from "../decorators/payload/EnduserPayload";

/**
 * Adds a new file record to a specific Telegram download job.
 *
 * This operation is secured and requires the caller to be an authenticated end
 * user. It ensures the end user owns the download job before allowing file
 * creation.
 *
 * @param props - Parameters including authenticated endUser, downloadJobId, and
 *   file data
 * @param props.endUser - Authenticated end user payload
 * @param props.downloadJobId - UUID of the download job to associate the file
 *   with
 * @param props.body - File creation data as per
 *   ITelegramFileDownloaderFiles.ICreate
 * @returns The newly created file record with all metadata
 * @throws {Error} When download job does not exist
 * @throws {Error} When the end user does not own the specified download job
 */
export async function posttelegramFileDownloaderEndUserDownloadJobsDownloadJobIdFiles(props: {
  endUser: EnduserPayload;
  downloadJobId: string & tags.Format<"uuid">;
  body: ITelegramFileDownloaderFiles.ICreate;
}): Promise<ITelegramFileDownloaderFiles> {
  const { endUser, downloadJobId, body } = props;

  // Verify existence and ownership of the download job
  const downloadJob =
    await MyGlobal.prisma.telegram_file_downloader_download_jobs.findUnique({
      where: { id: downloadJobId },
    });

  if (downloadJob === null) {
    throw new Error("Download job not found");
  }

  if (downloadJob.enduser_id === null || downloadJob.enduser_id === undefined) {
    throw new Error("Unauthorized: Download job has no associated end user");
  }

  if (downloadJob.enduser_id !== endUser.id) {
    throw new Error("Unauthorized: You cannot add files to this download job");
  }

  // Generate new UUID for the file record id
  const newId = v4() as string & tags.Format<"uuid">;

  // Create the new file record in the database
  const created = await MyGlobal.prisma.telegram_file_downloader_files.create({
    data: {
      id: newId,
      download_job_id: downloadJobId,
      filename: body.filename,
      file_extension: body.file_extension,
      file_size_bytes: body.file_size_bytes,
      s3_url: body.s3_url,
      created_at: body.created_at,
      updated_at: body.updated_at,
      deleted_at: body.deleted_at ?? undefined,
    },
  });

  // Return the created file metadata with correct date-time formatting
  return {
    id: created.id,
    download_job_id: created.download_job_id,
    filename: created.filename,
    file_extension: created.file_extension,
    file_size_bytes: created.file_size_bytes,
    s3_url: created.s3_url,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
    deleted_at: created.deleted_at ?? null,
  };
}
