import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderSubscriptionAudits } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderSubscriptionAudits";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Get detailed subscription audit by ID
 *
 * Retrieves detailed information for a specific subscription audit record using
 * its unique identifier. This includes all stored data related to subscription
 * changes such as upgrades, downgrades, cancellations, and associated billing
 * events tied to a user.
 *
 * Only administrators with proper privileges can access this endpoint.
 *
 * @param props - Object containing the authenticated administrator and audit ID
 * @param props.administrator - Authenticated administrator user's payload
 * @param props.subscriptionAuditId - UUID of the subscription audit record to
 *   fetch
 * @returns Detailed subscription audit information wrapped in an array
 * @throws {Error} Throws if the subscription audit record is not found
 */
export async function gettelegramFileDownloaderAdministratorSubscriptionAuditsSubscriptionAuditId(props: {
  administrator: AdministratorPayload;
  subscriptionAuditId: string & tags.Format<"uuid">;
}): Promise<ITelegramFileDownloaderSubscriptionAudits> {
  const { administrator, subscriptionAuditId } = props;

  // Fetch the subscription audit record by ID or throw if not found
  const result =
    await MyGlobal.prisma.telegram_file_downloader_subscription_audits.findUniqueOrThrow(
      {
        where: { id: subscriptionAuditId },
      },
    );

  // Map and convert DateTime fields to string format, handle nullables
  return [
    {
      id: result.id,
      telegram_file_downloader_subscription_plan_id:
        result.telegram_file_downloader_subscription_plan_id,
      telegram_file_downloader_payment_id:
        result.telegram_file_downloader_payment_id ?? null,
      user_id: result.user_id,
      change_type: result.change_type,
      change_timestamp: toISOStringSafe(result.change_timestamp),
      notes: result.notes ?? null,
      created_at: toISOStringSafe(result.created_at),
      updated_at: toISOStringSafe(result.updated_at),
      deleted_at: result.deleted_at ? toISOStringSafe(result.deleted_at) : null,
    },
  ];
}
