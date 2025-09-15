import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderSubscriptionPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderSubscriptionPlans";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Update an existing subscription plan identified by its unique ID.
 *
 * This operation updates properties such as code, name, price, max files per
 * day, max file size, total storage, and status.
 *
 * The updated_at timestamp is set to the current time during update.
 *
 * Requires authorization as an administrator.
 *
 * @param props - Object containing administrator credentials, subscription plan
 *   ID, and update body
 * @param props.administrator - Authenticated administrator payload
 * @param props.id - UUID of the subscription plan to update
 * @param props.body - Partial update data for subscription plan
 * @returns The updated subscription plan record with all fields
 * @throws {Error} When the subscription plan with given ID does not exist or is
 *   soft deleted
 */
export async function puttelegramFileDownloaderAdministratorSubscriptionPlansId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
  body: ITelegramFileDownloaderSubscriptionPlans.IUpdate;
}): Promise<ITelegramFileDownloaderSubscriptionPlans> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const plan =
    await MyGlobal.prisma.telegram_file_downloader_subscription_plans.findFirst(
      {
        where: { id: props.id, deleted_at: null },
      },
    );

  if (!plan) throw new Error("Subscription plan not found");

  const updated =
    await MyGlobal.prisma.telegram_file_downloader_subscription_plans.update({
      where: { id: props.id },
      data: {
        code: props.body.code ?? undefined,
        name: props.body.name ?? undefined,
        price: props.body.price ?? undefined,
        max_files_per_day: props.body.max_files_per_day ?? undefined,
        max_file_size_mb: props.body.max_file_size_mb ?? undefined,
        total_storage_mb: props.body.total_storage_mb ?? undefined,
        status: props.body.status ?? undefined,
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    price: updated.price,
    max_files_per_day: updated.max_files_per_day,
    max_file_size_mb: updated.max_file_size_mb,
    total_storage_mb: updated.total_storage_mb,
    status: updated.status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
