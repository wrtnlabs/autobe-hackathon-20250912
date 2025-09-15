import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderDownloadJob } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJob";
import { EnduserPayload } from "../decorators/payload/EnduserPayload";

/**
 * Creates a new Telegram File Downloader download job for an authenticated end
 * user.
 *
 * This function links the new download job to the authenticated end user,
 * initializes status to 'pending', and handles optional filters. All date and
 * datetime fields are handled as ISO strings, and UUIDs are generated safely.
 *
 * @param props - Object with authenticated end user and new download job data
 * @param props.endUser - Authenticated end user
 * @param props.body - Download job creation data
 * @returns The created download job record
 * @throws {Error} On database errors or failures
 */
export async function posttelegramFileDownloaderEndUserDownloadJobs(props: {
  endUser: EnduserPayload;
  body: ITelegramFileDownloaderDownloadJob.ICreate;
}): Promise<ITelegramFileDownloaderDownloadJob> {
  const { endUser, body } = props;

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const newId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.telegram_file_downloader_download_jobs.create({
      data: {
        id: newId,
        enduser_id: endUser.id,
        developer_id: null,
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
    id: created.id as string & tags.Format<"uuid">,
    enduser_id: created.enduser_id ?? null,
    developer_id: created.developer_id ?? null,
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
