import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderSubscriptionPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderSubscriptionPlans";
import { EnduserPayload } from "../decorators/payload/EnduserPayload";

/**
 * Retrieve detailed subscription plan information by unique ID.
 *
 * This operation fetches full metadata about a subscription plan including
 * pricing, file limits, file size limits, storage quotas, and status.
 *
 * Access is restricted to authorized end users.
 *
 * @param props - The input parameters including authorized end user and
 *   subscription plan ID.
 * @param props.endUser - Authenticated end user payload.
 * @param props.id - UUID of the subscription plan to retrieve.
 * @returns The detailed subscription plan information conforming to
 *   ITelegramFileDownloaderSubscriptionPlans.
 * @throws {Error} Throws if the subscription plan does not exist (404 Not
 *   Found).
 */
export async function gettelegramFileDownloaderEndUserSubscriptionPlansId(props: {
  endUser: EnduserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITelegramFileDownloaderSubscriptionPlans> {
  const { endUser, id } = props;

  const plan =
    await MyGlobal.prisma.telegram_file_downloader_subscription_plans.findUniqueOrThrow(
      {
        where: { id },
      },
    );

  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    price: plan.price,
    max_files_per_day: plan.max_files_per_day,
    max_file_size_mb: plan.max_file_size_mb,
    total_storage_mb: plan.total_storage_mb,
    status: plan.status,
    created_at: toISOStringSafe(plan.created_at),
    updated_at: toISOStringSafe(plan.updated_at),
    deleted_at: plan.deleted_at ? toISOStringSafe(plan.deleted_at) : null,
  };
}
