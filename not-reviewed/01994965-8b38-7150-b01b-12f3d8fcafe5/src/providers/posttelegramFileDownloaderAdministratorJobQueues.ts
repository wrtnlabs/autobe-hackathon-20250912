import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderJobQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderJobQueue";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Enqueue a new file download job in the job queue.
 *
 * This function creates a new job queue entry for the specified download job.
 * It validates that the job_id exists and no duplicate queue entry exists. The
 * administrator authorization is assumed to be handled by middleware.
 *
 * @param props - Object containing administrator payload and creation body data
 * @param props.administrator - The authenticated administrator making the
 *   request
 * @param props.body - Details required to create the job queue entry
 * @returns The created job queue entry with all fields populated
 * @throws {Error} When the referenced download job doesn't exist
 * @throws {Error} When a job queue entry with the same job_id already exists
 */
export async function posttelegramFileDownloaderAdministratorJobQueues(props: {
  administrator: AdministratorPayload;
  body: ITelegramFileDownloaderJobQueue.ICreate;
}): Promise<ITelegramFileDownloaderJobQueue> {
  const { administrator, body } = props;

  // Validate that the provided job_id exists in download jobs table
  const existingJob =
    await MyGlobal.prisma.telegram_file_downloader_download_jobs.findUnique({
      where: { id: body.job_id },
    });
  if (!existingJob)
    throw new Error(`Download job with id ${body.job_id} does not exist`);

  // Check for duplicate job queue entries
  const existingQueue =
    await MyGlobal.prisma.telegram_file_downloader_job_queues.findUnique({
      where: { job_id: body.job_id },
    });
  if (existingQueue)
    throw new Error(`Job queue entry for job_id ${body.job_id} already exists`);

  // Generate new id and timestamp strings (UUID and ISO 8601)
  const id = v4();
  typia.assertGuard<string & tags.Format<"uuid">>(id);
  const now = toISOStringSafe(new Date());

  // Create the new job queue entry
  const created =
    await MyGlobal.prisma.telegram_file_downloader_job_queues.create({
      data: {
        id: id,
        job_id: body.job_id,
        status: body.status,
        priority: body.priority,
        retries: body.retries ?? 0,
        last_error_message: body.last_error_message ?? null,
        created_at: now,
        updated_at: now,
      },
    });

  // Return the created record with all date/datetime fields as ISO strings
  return {
    id,
    job_id: created.job_id,
    status: created.status,
    priority: created.priority,
    retries: created.retries,
    last_error_message: created.last_error_message ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
