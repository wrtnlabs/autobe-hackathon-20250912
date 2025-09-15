import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderBillingLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderBillingLog";
import { IPageITelegramFileDownloaderBillingLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderBillingLog";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Search and retrieve a paginated list of billing logs containing payment and
 * billing event details for administrators in the Telegram File Downloader
 * system.
 *
 * Supports filtering by related payment ID, event type, date ranges,
 * pagination, and sorting.
 *
 * @param props - Object containing the administrator payload and request body
 *   with filter criteria.
 * @param props.administrator - Authenticated administrator payload for
 *   authorization.
 * @param props.body - Filter and pagination criteria for billing logs.
 * @returns Paginated billing log entries matching the filter criteria.
 * @throws {Error} When query execution fails or data retrieval errors occur.
 */
export async function patchtelegramFileDownloaderAdministratorBillingLogs(props: {
  administrator: AdministratorPayload;
  body: ITelegramFileDownloaderBillingLog.IRequest;
}): Promise<IPageITelegramFileDownloaderBillingLog> {
  const { administrator, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;

  const where = {
    deleted_at: null,
    ...(body.telegram_file_downloader_payment_id !== undefined &&
      body.telegram_file_downloader_payment_id !== null && {
        telegram_file_downloader_payment_id:
          body.telegram_file_downloader_payment_id,
      }),
    ...(body.event_type !== undefined &&
      body.event_type !== null && { event_type: body.event_type }),
    ...((body.event_timestamp_start !== undefined &&
      body.event_timestamp_start !== null) ||
    (body.event_timestamp_end !== undefined &&
      body.event_timestamp_end !== null)
      ? {
          event_timestamp: {
            ...(body.event_timestamp_start !== undefined &&
              body.event_timestamp_start !== null && {
                gte: body.event_timestamp_start,
              }),
            ...(body.event_timestamp_end !== undefined &&
              body.event_timestamp_end !== null && {
                lte: body.event_timestamp_end,
              }),
          },
        }
      : {}),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.telegram_file_downloader_billing_logs.findMany({
      where,
      orderBy: body.sort_by
        ? {
            [body.sort_by]: body.sort_order === "asc" ? "asc" : "desc",
          }
        : { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.telegram_file_downloader_billing_logs.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id,
      telegram_file_downloader_payment_id:
        item.telegram_file_downloader_payment_id,
      event_type: item.event_type,
      event_timestamp: item.event_timestamp
        ? toISOStringSafe(item.event_timestamp)
        : ("" as string & tags.Format<"date-time">),
      details: item.details ?? null,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
