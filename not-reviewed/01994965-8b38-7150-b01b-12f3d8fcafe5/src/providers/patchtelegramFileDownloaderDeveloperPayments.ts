import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderPayment";
import { IPageITelegramFileDownloaderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderPayment";
import { DeveloperPayload } from "../decorators/payload/DeveloperPayload";

/**
 * Retrieves a paginated list of developer payments filtered by various optional
 * criteria.
 *
 * @param props - Object containing authenticated developer and filter criteria
 * @param props.developer - Authenticated developer payload
 * @param props.body - Filter and pagination criteria to query payments
 * @returns A paginated list of payments matching the criteria
 * @throws {Error} Throws if database operations fail
 */
export async function patchtelegramFileDownloaderDeveloperPayments(props: {
  developer: DeveloperPayload;
  body: ITelegramFileDownloaderPayment.IRequest;
}): Promise<IPageITelegramFileDownloaderPayment> {
  const { body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where: {
    deleted_at: null;
    subscription_plan_id?: string & tags.Format<"uuid">;
    user_id?: string & tags.Format<"uuid">;
    payment_provider?: string;
    payment_status?: string;
    payment_date?: {
      gte?: (string & tags.Format<"date-time">) | undefined;
      lte?: (string & tags.Format<"date-time">) | undefined;
    };
  } = {
    deleted_at: null,
  };

  if (
    body.subscription_plan_id !== undefined &&
    body.subscription_plan_id !== null
  ) {
    where.subscription_plan_id = body.subscription_plan_id;
  }
  if (body.user_id !== undefined && body.user_id !== null) {
    where.user_id = body.user_id;
  }
  if (body.payment_provider !== undefined && body.payment_provider !== null) {
    where.payment_provider = body.payment_provider;
  }
  if (body.payment_status !== undefined && body.payment_status !== null) {
    where.payment_status = body.payment_status;
  }
  if (
    (body.payment_date_start !== undefined &&
      body.payment_date_start !== null) ||
    (body.payment_date_end !== undefined && body.payment_date_end !== null)
  ) {
    where.payment_date = {};
    if (
      body.payment_date_start !== undefined &&
      body.payment_date_start !== null
    ) {
      where.payment_date.gte = body.payment_date_start;
    }
    if (body.payment_date_end !== undefined && body.payment_date_end !== null) {
      where.payment_date.lte = body.payment_date_end;
    }
  }

  const [results, total] = await Promise.all([
    MyGlobal.prisma.telegram_file_downloader_payments.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
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
      id: item.id,
      subscription_plan_id: item.subscription_plan_id,
      user_id: item.user_id,
      payment_provider: item.payment_provider,
      payment_status: item.payment_status,
      payment_amount: item.payment_amount,
      payment_currency: item.payment_currency,
      payment_reference_id: item.payment_reference_id,
      payment_date: item.payment_date
        ? toISOStringSafe(item.payment_date)
        : undefined,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
