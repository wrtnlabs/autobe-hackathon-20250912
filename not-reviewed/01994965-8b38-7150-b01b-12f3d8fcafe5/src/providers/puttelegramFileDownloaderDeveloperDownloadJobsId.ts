import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderDownloadJob } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderDownloadJob";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Update an existing download job entity by its unique ID.
 *
 * This operation allows authorized developers to update mutable fields such as
 * file type filters, date ranges, and status for their own download jobs,
 * provided the job is not soft deleted or completed.
 *
 * Authorization is verified by confirming that the download job belongs to the
 * requesting developer.
 *
 * @param props - Object containing developer authentication, job ID, and update
 *   data.
 * @param props.developer - Authenticated developer payload performing the
 *   update.
 * @param props.id - UUID of the download job to update.
 * @param props.body - Partial update data for the download job mutable fields.
 * @returns The updated download job entity with all relevant fields.
 * @throws {Error} If the job does not exist, is soft deleted, completed, or if
 *   authorization fails.
 */
export async function puttelegramFileDownloaderDeveloperDownloadJobsId(props: {
  developer: DeveloperPayload;
  id: string & tags.Format<"uuid">;
  body: ITelegramFileDownloaderDownloadJob.IUpdate;
}): Promise<ITelegramFileDownloaderDownloadJob> {
  const { developer, id, body } = props;

  // Retrieve the existing download job
  const job =
    await MyGlobal.prisma.telegram_file_downloader_download_jobs.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  // Check if the job is soft deleted
  if (job.deleted_at !== null) {
    throw new Error("Cannot update a deleted download job.");
  }

  // Verify ownership: only the developer who owns the job can update
  if (job.developer_id !== developer.id) {
    throw new Error(
      "Unauthorized: You can only update your own download jobs.",
    );
  }

  // Prevent updates if the job is completed
  if (job.status === "completed") {
    throw new Error("Cannot update a completed download job.");
  }

  // Construct update data with provided mutable fields
  const updateData: {
    channel_id?: string;
    file_types?: string | null;
    date_start?: string | null;
    date_end?: string | null;
    status?: string;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };

  if (body.channel_id !== undefined) updateData.channel_id = body.channel_id;
  if (body.file_types !== undefined)
    updateData.file_types = body.file_types ?? null;
  if (body.date_start !== undefined)
    updateData.date_start = body.date_start ?? null;
  if (body.date_end !== undefined) updateData.date_end = body.date_end ?? null;
  if (body.status !== undefined) updateData.status = body.status;

  // Perform update operation
  const updated =
    await MyGlobal.prisma.telegram_file_downloader_download_jobs.update({
      where: { id },
      data: updateData,
    });

  // Return updated job, converting all date fields properly
  return {
    id: updated.id,
    enduser_id: updated.enduser_id ?? undefined,
    developer_id: updated.developer_id ?? undefined,
    channel_id: updated.channel_id,
    file_types: updated.file_types ?? null,
    date_start: updated.date_start ? toISOStringSafe(updated.date_start) : null,
    date_end: updated.date_end ? toISOStringSafe(updated.date_end) : null,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
