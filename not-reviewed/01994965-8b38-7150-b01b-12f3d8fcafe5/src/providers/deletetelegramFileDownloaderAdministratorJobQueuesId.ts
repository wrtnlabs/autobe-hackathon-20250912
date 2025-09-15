import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Delete a job queue entry by ID to remove the download job from the queue.
 *
 * This operation permanently removes a record from the
 * 'telegram_file_downloader_job_queues' table. It is a hard delete operation
 * and does not use soft-deletion fields. Only administrators are authorized to
 * perform this operation.
 *
 * @param props - Object containing the administrator payload and ID of the job
 *   queue entry
 * @param props.administrator - The authenticated administrator performing the
 *   deletion
 * @param props.id - UUID of the job queue entry to delete
 * @returns Void
 * @throws {Error} If the job queue entry with the given ID does not exist
 */
export async function deletetelegramFileDownloaderAdministratorJobQueuesId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const { administrator, id } = props;

  await MyGlobal.prisma.telegram_file_downloader_job_queues.delete({
    where: { id },
  });
}
