import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderPayment";
import { IPageITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderPayment";
import { EnduserPayload } from "../decorators/payload/EnduserPayload";

/**
 * Retrieve a paginated list of payments made by the authenticated end user.
 *
 * Supports filtering by subscription plan ID, payment provider, payment status,
 * and payment date range. Pagination parameters `page` and `limit` control the
 * pagination.
 *
 * @param props - Object containing the authenticated end user and filter
 *   parameters
 * @param props.endUser - The authenticated end user making the request
 * @param props.body - Search criteria and pagination parameters for payments
 * @returns A paginated list of payments matching the search criteria
 * @throws {Error} When any unexpected errors occur during database operations
 */
export async function patchtelegramFileDownloaderEndUserPayments(props: {
  endUser: EnduserPayload;
  body: ITelegramFileDownloaderPayment.IRequest;
}): Promise<IPageITelegramFileDownloaderPayment> {
  const { endUser, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const whereCondition = {
    user_id: endUser.id,
    ...(body.subscription_plan_id !== undefined &&
      body.subscription_plan_id !== null && {
        subscription_plan_id: body.subscription_plan_id,
      }),
    ...(body.payment_provider !== undefined &&
      body.payment_provider !== null && {
        payment_provider: body.payment_provider,
      }),
    ...(body.payment_status !== undefined &&
      body.payment_status !== null && { payment_status: body.payment_status }),
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
              body.payment_date_end !== null && { lte: body.payment_date_end }),
          },
        }
      : {}),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.telegram_file_downloader_payments.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { payment_date: "desc" },
    }),
    MyGlobal.prisma.telegram_file_downloader_payments.count({
      where: whereCondition,
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
      subscription_plan_id: item.subscription_plan_id,
      user_id: item.user_id,
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
