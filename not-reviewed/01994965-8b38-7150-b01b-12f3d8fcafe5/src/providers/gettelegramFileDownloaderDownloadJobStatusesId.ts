import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderDownloadJobStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJobStatus";

/**
 * Retrieve detailed information of a single download job status entry by its
 * unique ID.
 *
 * This read-only operation fetches the status code and description for a
 * download job status, supporting UIs and API clients with meaningful lifecycle
 * state representations.
 *
 * Access is public with no authorization required.
 *
 * @param props - Object containing the unique identifier of the download job
 *   status.
 * @param props.id - UUID identifier of the download job status record.
 * @returns The download job status record including its code, description,
 *   timestamps, and optional deletion timestamp.
 * @throws {Error} Throws if no record is found with the given ID.
 */
export async function gettelegramFileDownloaderDownloadJobStatusesId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<ITelegramFileDownloaderDownloadJobStatus> {
  const { id } = props;

  const record =
    await MyGlobal.prisma.telegram_file_downloader_download_job_statuses.findUniqueOrThrow(
      {
        where: { id },
        select: {
          id: true,
          status_code: true,
          description: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );

  return {
    id: record.id,
    status_code: record.status_code,
    description: record.description,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
