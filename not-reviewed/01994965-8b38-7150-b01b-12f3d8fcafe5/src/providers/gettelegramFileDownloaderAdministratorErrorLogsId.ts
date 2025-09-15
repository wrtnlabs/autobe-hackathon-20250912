import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderErrorLog";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve detailed information for a specific error log entry.
 *
 * This function fetches a single error log by its unique identifier from the
 * 'telegram_file_downloader_error_logs' table to assist administrators in
 * diagnosing and monitoring backend system issues.
 *
 * Access is restricted to authenticated administrators. The function throws if
 * no error log with the specified id exists.
 *
 * @param props - Object containing the administrator payload and the error log
 *   id
 * @param props.administrator - Authenticated administrator payload
 * @param props.id - UUID of the error log to retrieve
 * @returns The detailed error log entry matching the provided id
 * @throws {Error} Throws if the error log with the specified id does not exist
 */
export async function gettelegramFileDownloaderAdministratorErrorLogsId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITelegramFileDownloaderErrorLog> {
  const errorLog =
    await MyGlobal.prisma.telegram_file_downloader_error_logs.findUniqueOrThrow(
      {
        where: { id: props.id },
      },
    );

  return {
    id: errorLog.id,
    error_code: errorLog.error_code,
    error_message: errorLog.error_message,
    source_component: errorLog.source_component,
    occurred_at: toISOStringSafe(errorLog.occurred_at),
    resolved: errorLog.resolved,
    created_at: toISOStringSafe(errorLog.created_at),
    updated_at: toISOStringSafe(errorLog.updated_at),
    deleted_at: errorLog.deleted_at
      ? toISOStringSafe(errorLog.deleted_at)
      : null,
  };
}
