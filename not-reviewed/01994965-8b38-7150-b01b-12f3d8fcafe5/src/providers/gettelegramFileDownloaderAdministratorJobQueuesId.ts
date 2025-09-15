import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderJobQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderJobQueue";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve detailed job queue information by ID.
 *
 * This operation fetches detailed information of a single job queue entry
 * identified by its unique ID from the telegram_file_downloader_job_queues
 * table. It provides full metadata including job status, priority, retry count,
 * last error details, and timestamps.
 *
 * Access is restricted to authorized administrators to protect sensitive
 * operational information.
 *
 * @param props - Object containing the administrator credentials and job queue
 *   entry ID
 * @param props.administrator - Authenticated administrator requesting the data
 * @param props.id - Unique identifier (UUID) of the job queue entry
 * @returns Detailed job queue entry matching the given ID
 * @throws {Error} Throws if no job queue entry is found with the given ID
 */
export async function gettelegramFileDownloaderAdministratorJobQueuesId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITelegramFileDownloaderJobQueue> {
  const { administrator, id } = props;

  const jobQueue =
    await MyGlobal.prisma.telegram_file_downloader_job_queues.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  return {
    id: jobQueue.id as string & tags.Format<"uuid">,
    job_id: jobQueue.job_id as string & tags.Format<"uuid">,
    status: jobQueue.status,
    priority: jobQueue.priority as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    retries: jobQueue.retries as number & tags.Type<"int32"> & tags.Minimum<0>,
    last_error_message: jobQueue.last_error_message ?? null,
    created_at: toISOStringSafe(jobQueue.created_at),
    updated_at: toISOStringSafe(jobQueue.updated_at),
    deleted_at: jobQueue.deleted_at
      ? toISOStringSafe(jobQueue.deleted_at)
      : null,
  };
}
