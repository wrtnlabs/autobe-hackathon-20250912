import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderBillingLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderBillingLog";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve billing log details by ID from
 * telegram_file_downloader_billing_logs.
 *
 * This endpoint is restricted to administrator users and returns detailed
 * information including event type, timestamps, associated payment references,
 * and optional metadata.
 *
 * @param props - Object containing administrator payload and billing log ID
 * @param props.administrator - Authenticated administrator making the request
 * @param props.billingLogId - UUID of the billing log entry to retrieve
 * @returns Detailed billing log entry conforming to
 *   ITelegramFileDownloaderBillingLog
 * @throws {Error} If no billing log entry with the given ID is found
 */
export async function gettelegramFileDownloaderAdministratorBillingLogsBillingLogId(props: {
  administrator: AdministratorPayload;
  billingLogId: string & tags.Format<"uuid">;
}): Promise<ITelegramFileDownloaderBillingLog> {
  const { billingLogId } = props;

  const record =
    await MyGlobal.prisma.telegram_file_downloader_billing_logs.findUniqueOrThrow(
      {
        where: { id: billingLogId },
        select: {
          id: true,
          telegram_file_downloader_payment_id: true,
          event_type: true,
          event_timestamp: true,
          details: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );

  return {
    id: record.id,
    telegram_file_downloader_payment_id:
      record.telegram_file_downloader_payment_id,
    event_type: record.event_type,
    event_timestamp: toISOStringSafe(record.event_timestamp),
    details: record.details ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
