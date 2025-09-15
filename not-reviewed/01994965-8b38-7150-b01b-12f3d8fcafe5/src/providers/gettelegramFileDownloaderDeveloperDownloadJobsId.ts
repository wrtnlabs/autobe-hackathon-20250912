import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderDownloadJob } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJob";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Retrieves detailed information of a specific download job by its unique UUID
 * for a developer user.
 *
 * This function fetches the download job from the database, excluding
 * soft-deleted records. It validates that the requesting developer owns the
 * download job.
 *
 * @param props - Object containing the authenticated developer payload and
 *   download job ID
 * @param props.developer - The authenticated developer making the request
 * @param props.id - The UUID of the download job to retrieve
 * @returns A promise resolving to the download job details conforming to
 *   ITelegramFileDownloaderDownloadJob
 * @throws {Error} If the download job is not found or the developer is
 *   unauthorized
 */
export async function gettelegramFileDownloaderDeveloperDownloadJobsId(props: {
  developer: DeveloperPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITelegramFileDownloaderDownloadJob> {
  const { developer, id } = props;

  const record =
    await MyGlobal.prisma.telegram_file_downloader_download_jobs.findFirstOrThrow(
      {
        where: { id, deleted_at: null },
      },
    );

  if (record.developer_id !== developer.id) {
    throw new Error(
      "Unauthorized: This download job does not belong to the developer",
    );
  }

  return {
    id: record.id,
    enduser_id: record.enduser_id ?? undefined,
    developer_id: record.developer_id ?? undefined,
    channel_id: record.channel_id,
    file_types: record.file_types ?? undefined,
    date_start: record.date_start ?? undefined,
    date_end: record.date_end ?? undefined,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ?? undefined,
  };
}
