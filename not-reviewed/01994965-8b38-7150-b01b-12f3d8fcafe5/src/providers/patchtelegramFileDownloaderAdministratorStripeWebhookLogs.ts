import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderStripeWebhookLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderStripeWebhookLogs";
import { IPageITelegramFileDownloaderStripeWebhookLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderStripeWebhookLogs";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * List and search Stripe webhook logs with pagination.
 *
 * This operation retrieves a paginated list of Stripe webhook event logs
 * recorded by the Telegram File Downloader system. The logs include event IDs,
 * types, timestamps, and processing status. Filtering can be done by event_type
 * and processed status.
 *
 * Only users with administrator role can call this operation.
 *
 * @param props - Object containing the authenticated administrator and request
 *   body with pagination and filter options.
 * @param props.administrator - The authenticated administrator user.
 * @param props.body - Pagination and filtering parameters.
 * @returns A page of Stripe webhook log summaries.
 * @throws {Error} When database operation fails or parameters are invalid.
 */
export async function patchtelegramFileDownloaderAdministratorStripeWebhookLogs(props: {
  administrator: AdministratorPayload;
  body: ITelegramFileDownloaderStripeWebhookLogs.IRequest;
}): Promise<IPageITelegramFileDownloaderStripeWebhookLogs.ISummary> {
  const { administrator, body } = props;

  // Pagination using defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;

  // Build filtering conditions
  const where = {} as {
    event_type?: string;
    processed?: boolean;
  };

  if (body.event_type !== undefined && body.event_type !== null) {
    where.event_type = body.event_type;
  }

  if (body.processed !== undefined && body.processed !== null) {
    where.processed = body.processed;
  }

  // Fetch records and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.telegram_file_downloader_stripe_webhook_logs.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { received_at: "desc" },
      select: {
        id: true,
        event_id: true,
        event_type: true,
        received_at: true,
        processed: true,
      },
    }),
    MyGlobal.prisma.telegram_file_downloader_stripe_webhook_logs.count({
      where,
    }),
  ]);

  // Map result to summary type
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((item) => ({
      id: item.id,
      event_id: item.event_id,
      event_type: item.event_type,
      received_at: toISOStringSafe(item.received_at),
      processed: item.processed,
    })),
  };
}
