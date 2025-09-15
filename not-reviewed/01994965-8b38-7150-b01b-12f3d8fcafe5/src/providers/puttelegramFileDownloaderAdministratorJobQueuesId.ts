import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderJobQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderJobQueue";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Update job queue entry by ID
 *
 * This operation updates fields such as status, priority, retries, and last
 * error message of an existing job queue entry identified by the provided ID.
 * It ensures the entry exists, applies partial updates on allowed fields, and
 * returns the fully updated entry with all fields correctly typed.
 *
 * Authorization: Only accessible by authenticated administrators.
 *
 * @param props - Object containing administrator payload, job queue ID, and
 *   update data
 * @param props.administrator - Authenticated administrator payload performing
 *   the update
 * @param props.id - UUID of the job queue entry to update
 * @param props.body - Partial update fields including status, priority,
 *   retries, and last error message
 * @returns The updated job queue entry object
 * @throws {Error} Throws if the job queue entry does not exist
 */
export async function puttelegramFileDownloaderAdministratorJobQueuesId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
  body: ITelegramFileDownloaderJobQueue.IUpdate;
}): Promise<ITelegramFileDownloaderJobQueue> {
  const { administrator, id, body } = props;

  const existing =
    await MyGlobal.prisma.telegram_file_downloader_job_queues.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  const updated =
    await MyGlobal.prisma.telegram_file_downloader_job_queues.update({
      where: { id },
      data: {
        ...(body.status !== undefined &&
          body.status !== null && { status: body.status }),
        ...(body.priority !== undefined &&
          body.priority !== null && { priority: body.priority }),
        ...(body.retries !== undefined &&
          body.retries !== null && { retries: body.retries }),
        last_error_message:
          body.last_error_message === undefined
            ? existing.last_error_message
            : body.last_error_message,
      },
    });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    job_id: updated.job_id as string & tags.Format<"uuid">,
    status: updated.status,
    priority: updated.priority,
    retries: updated.retries,
    last_error_message: updated.last_error_message ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
