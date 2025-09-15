import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderDownloadJob } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJob";
import { EnduserPayload } from "../decorators/payload/EnduserPayload";

/**
 * Update an existing download job identified by its unique ID.
 *
 * Updates mutable properties such as file filters, date ranges, and status.
 * Ensures authorization and that the job is not completed or soft deleted.
 *
 * @param props - Object containing endUser payload, job ID, and update body
 * @param props.endUser - Authenticated end user with id and type
 * @param props.id - UUID of the download job to update
 * @param props.body - Partial update object conforming to
 *   ITelegramFileDownloaderDownloadJob.IUpdate
 * @returns The updated download job with all fields
 * @throws {Error} If the job does not exist, is deleted, is completed, or if
 *   unauthorized
 */
export async function puttelegramFileDownloaderEndUserDownloadJobsId(props: {
  endUser: EnduserPayload;
  id: string & tags.Format<"uuid">;
  body: ITelegramFileDownloaderDownloadJob.IUpdate;
}): Promise<ITelegramFileDownloaderDownloadJob> {
  const { endUser, id, body } = props;

  const job =
    await MyGlobal.prisma.telegram_file_downloader_download_jobs.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  if (job.deleted_at !== null) {
    throw new Error("Cannot update a deleted job.");
  }

  const isOwner =
    job.enduser_id === endUser.id || job.developer_id === endUser.id;
  if (!isOwner) {
    throw new Error("Unauthorized: You do not own this job.");
  }

  if (job.status === "completed") {
    throw new Error("Cannot update a completed job.");
  }

  const updates = {
    channel_id: body.channel_id ?? undefined,
    file_types: body.file_types ?? undefined,
    date_start:
      body.date_start === null ? null : (body.date_start ?? undefined),
    date_end: body.date_end === null ? null : (body.date_end ?? undefined),
    status: body.status ?? undefined,
  };

  const updated =
    await MyGlobal.prisma.telegram_file_downloader_download_jobs.update({
      where: { id },
      data: updates,
    });

  return {
    id: updated.id,
    enduser_id: updated.enduser_id ?? null,
    developer_id: updated.developer_id ?? null,
    channel_id: updated.channel_id,
    file_types: updated.file_types ?? null,
    date_start:
      updated.date_start === null ? null : toISOStringSafe(updated.date_start),
    date_end:
      updated.date_end === null ? null : toISOStringSafe(updated.date_end),
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
