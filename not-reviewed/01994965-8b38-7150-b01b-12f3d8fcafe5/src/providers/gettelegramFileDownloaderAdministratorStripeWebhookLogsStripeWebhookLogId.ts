import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderStripeWebhookLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderStripeWebhookLogs";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve Stripe webhook log details by ID.
 *
 * This operation retrieves detailed information about a specified Stripe
 * webhook log entry by its unique identifier. The data includes the full JSON
 * payload of the webhook event, event type, processing status, timestamps, and
 * any relevant metadata.
 *
 * Access is restricted to administrative users responsible for monitoring and
 * debugging payment processing events.
 *
 * @param props - Object containing the administrator payload and Stripe webhook
 *   log ID.
 * @param props.administrator - The authenticated administrator making the
 *   request.
 * @param props.stripeWebhookLogId - UUID representing the unique Stripe webhook
 *   log record.
 * @returns Promise resolving to the detailed Stripe webhook log record.
 * @throws {Error} Throws if no record with the provided ID exists.
 */
export async function gettelegramFileDownloaderAdministratorStripeWebhookLogsStripeWebhookLogId(props: {
  administrator: AdministratorPayload;
  stripeWebhookLogId: string & tags.Format<"uuid">;
}): Promise<ITelegramFileDownloaderStripeWebhookLogs> {
  const { administrator, stripeWebhookLogId } = props;

  const record =
    await MyGlobal.prisma.telegram_file_downloader_stripe_webhook_logs.findUniqueOrThrow(
      {
        where: { id: stripeWebhookLogId },
      },
    );

  return {
    id: record.id,
    event_id: record.event_id,
    event_type: record.event_type,
    payload: record.payload,
    received_at: toISOStringSafe(record.received_at),
    processed: record.processed,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
