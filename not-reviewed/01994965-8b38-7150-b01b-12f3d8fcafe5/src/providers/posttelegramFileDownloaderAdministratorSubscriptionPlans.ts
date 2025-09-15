import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderSubscriptionPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderSubscriptionPlans";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Create a new subscription plan with detailed properties including code, name,
 * pricing, file counts, size limits, quotas, and active status.
 *
 * Only authorized administrators may perform this operation.
 *
 * @param props - Object containing administrator authentication and
 *   subscription plan creation data.
 * @param props.administrator - The authenticated administrator making the
 *   request.
 * @param props.body - The subscription plan creation payload including code,
 *   name, price, limits, and status.
 * @returns The newly created subscription plan record.
 * @throws {Error} Throws if creation fails due to validation errors or
 *   duplicate plan code.
 */
export async function posttelegramFileDownloaderAdministratorSubscriptionPlans(props: {
  administrator: AdministratorPayload;
  body: ITelegramFileDownloaderSubscriptionPlans.ICreate;
}): Promise<ITelegramFileDownloaderSubscriptionPlans> {
  const { administrator, body } = props;

  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.telegram_file_downloader_subscription_plans.create({
      data: {
        id: v4(),
        code: body.code,
        name: body.name,
        price: body.price,
        max_files_per_day: body.max_files_per_day,
        max_file_size_mb: body.max_file_size_mb,
        total_storage_mb: body.total_storage_mb,
        status: body.status,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    code: created.code,
    name: created.name,
    price: created.price,
    max_files_per_day: created.max_files_per_day,
    max_file_size_mb: created.max_file_size_mb,
    total_storage_mb: created.total_storage_mb,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
