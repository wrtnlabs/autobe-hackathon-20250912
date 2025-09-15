import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderAuditLog";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve audit log details by ID from telegram_file_downloader_audit_logs.
 *
 * This function fetches a single audit log entry by its UUID, intended for use
 * by administrators. It ensures the audit log exists and returns full metadata
 * including timestamps, user references, action and entity details, IP address,
 * and soft delete status.
 *
 * @param props - Object containing the administrator payload and audit log ID.
 * @param props.administrator - The administrator payload performing the
 *   request.
 * @param props.id - Unique UUID of the audit log entry to retrieve.
 * @returns The complete audit log record.
 * @throws {Error} If no audit log with the given ID exists.
 */
export async function gettelegramFileDownloaderAdministratorAuditLogsId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITelegramFileDownloaderAuditLog> {
  const record =
    await MyGlobal.prisma.telegram_file_downloader_audit_logs.findUniqueOrThrow(
      {
        where: { id: props.id },
        select: {
          id: true,
          user_id: true,
          action_type: true,
          entity_type: true,
          entity_id: true,
          action_timestamp: true,
          ip_address: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );

  return {
    id: record.id,
    user_id: record.user_id ?? undefined,
    action_type: record.action_type,
    entity_type: record.entity_type,
    entity_id: record.entity_id ?? undefined,
    action_timestamp: toISOStringSafe(record.action_timestamp),
    ip_address: record.ip_address ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
