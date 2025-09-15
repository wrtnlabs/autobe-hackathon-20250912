import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderDownloadJob } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJob";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Creates a new Telegram File Downloader download job for a developer.
 *
 * This operation creates a download job with the specified Telegram channel ID,
 * optional file type filters, and optional date range filters for inclusive
 * filtering of files.
 *
 * The job status is initially set to 'pending'. The authenticated developer ID
 * is set as the owner of the job.
 *
 * @param props - Object containing the authenticated developer and the download
 *   job creation body
 * @param props.developer - The authenticated developer payload
 * @param props.body - Download job creation data including channel ID and
 *   optional filters
 * @returns The newly created download job record with full properties
 * @throws {Error} If the creation fails due to DB or validation errors
 */
export async function posttelegramFileDownloaderDeveloperDownloadJobs(props: {
  developer: DeveloperPayload;
  body: ITelegramFileDownloaderDownloadJob.ICreate;
}): Promise<ITelegramFileDownloaderDownloadJob> {
  const { developer, body } = props;

  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.telegram_file_downloader_download_jobs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        developer_id: developer.id,
        enduser_id: null,
        channel_id: body.channel_id,
        file_types: body.file_types ?? null,
        date_start: body.date_start ?? null,
        date_end: body.date_end ?? null,
        status: "pending",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    developer_id: created.developer_id ?? null,
    enduser_id: created.enduser_id ?? null,
    channel_id: created.channel_id,
    file_types: created.file_types ?? null,
    date_start: created.date_start ? toISOStringSafe(created.date_start) : null,
    date_end: created.date_end ? toISOStringSafe(created.date_end) : null,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
