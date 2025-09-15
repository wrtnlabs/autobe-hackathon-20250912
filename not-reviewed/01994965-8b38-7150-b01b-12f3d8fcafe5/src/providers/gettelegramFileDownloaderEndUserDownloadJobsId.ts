import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderDownloadJob } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJob";
import { EnduserPayload } from "../decorators/payload/EnduserPayload";

/**
 * Retrieve a specific download job record by its UUID.
 *
 * Ensures that the download job belongs to the authenticated end user and that
 * the job has not been soft deleted.
 *
 * @param props - Object containing the endUser payload and the download job ID
 * @param props.endUser - Authenticated end user making the request
 * @param props.id - UUID of the download job to retrieve
 * @returns The detailed download job record conforming to
 *   ITelegramFileDownloaderDownloadJob
 * @throws Will throw an error if the download job is not found or the user is
 *   unauthorized
 */
export async function gettelegramFileDownloaderEndUserDownloadJobsId(props: {
  endUser: EnduserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITelegramFileDownloaderDownloadJob> {
  const { endUser, id } = props;

  const record =
    await MyGlobal.prisma.telegram_file_downloader_download_jobs.findFirstOrThrow(
      {
        where: {
          id,
          enduser_id: endUser.id,
          deleted_at: null,
        },
      },
    );

  return {
    id: record.id,
    enduser_id:
      record.enduser_id === null ? null : (record.enduser_id ?? undefined),
    developer_id:
      record.developer_id === null ? null : (record.developer_id ?? undefined),
    channel_id: record.channel_id,
    file_types:
      record.file_types === null ? null : (record.file_types ?? undefined),
    date_start: record.date_start ? toISOStringSafe(record.date_start) : null,
    date_end: record.date_end ? toISOStringSafe(record.date_end) : null,
    status: record.status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
