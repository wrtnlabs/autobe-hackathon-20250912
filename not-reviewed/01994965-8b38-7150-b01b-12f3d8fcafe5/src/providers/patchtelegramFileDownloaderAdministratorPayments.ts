import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderPayment";
import { IPageITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderPayment";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieves a paginated list of payments, reflecting payment transactions
 * associated with user subscription plans. Filters support payment provider,
 * status, user ID, and payment date ranges. Access restricted to authenticated
 * administrators.
 *
 * @param props - Object containing the administrator payload and search/filter
 *   parameters
 * @returns Paginated list of payments matching the search criteria
 * @throws {Error} If database operations fail
 */
export async function patchtelegramFileDownloaderAdministratorPayments(props: {
  administrator: AdministratorPayload;
  body: ITelegramFileDownloaderPayment.IRequest;
}): Promise<IPageITelegramFileDownloaderPayment> {
  const { administrator, body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null as null,
    ...(body.subscription_plan_id !== undefined &&
      body.subscription_plan_id !== null && {
        subscription_plan_id: body.subscription_plan_id,
      }),
    ...(body.user_id !== undefined &&
      body.user_id !== null && {
        user_id: body.user_id,
      }),
    ...(body.payment_provider !== undefined &&
      body.payment_provider !== null && {
        payment_provider: { contains: body.payment_provider },
      }),
    ...(body.payment_status !== undefined &&
      body.payment_status !== null && {
        payment_status: { contains: body.payment_status },
      }),
    ...((body.payment_date_start !== undefined &&
      body.payment_date_start !== null) ||
    (body.payment_date_end !== undefined && body.payment_date_end !== null)
      ? {
          payment_date: {
            ...(body.payment_date_start !== undefined &&
              body.payment_date_start !== null && {
                gte: body.payment_date_start,
              }),
            ...(body.payment_date_end !== undefined &&
              body.payment_date_end !== null && {
                lte: body.payment_date_end,
              }),
          },
        }
      : {}),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.telegram_file_downloader_payments.findMany({
      where,
      skip,
      take: limit,
      orderBy: { payment_date: "desc" },
    }),
    MyGlobal.prisma.telegram_file_downloader_payments.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      subscription_plan_id: item.subscription_plan_id as string &
        tags.Format<"uuid">,
      user_id: item.user_id as string & tags.Format<"uuid">,
      payment_provider: item.payment_provider,
      payment_status: item.payment_status,
      payment_amount: item.payment_amount,
      payment_currency: item.payment_currency,
      payment_reference_id: item.payment_reference_id,
      payment_date: toISOStringSafe(item.payment_date),
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
