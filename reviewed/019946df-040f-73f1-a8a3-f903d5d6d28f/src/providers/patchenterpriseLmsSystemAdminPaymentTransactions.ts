import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsPaymentTransaction";
import { IPageIEnterpriseLmsPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEnterpriseLmsPaymentTransaction";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a filtered, paginated list of payment transactions
 *
 * This endpoint allows authorized system administrators to query payment
 * transactions within the Enterprise LMS. Supports filtering by tenant, user,
 * status, payment method, transaction code, amount ranges, currency, and
 * creation date ranges. Results are paginated and sorted by creation date
 * descending.
 *
 * @param props - Object containing the authenticated systemAdmin and filtering
 *   body
 * @param props.systemAdmin - The authenticated system admin making the request
 * @param props.body - The filtering and pagination criteria
 * @returns Paginated list of payment transaction summaries matching filters
 */
export async function patchenterpriseLmsSystemAdminPaymentTransactions(props: {
  systemAdmin: SystemadminPayload;
  body: IEnterpriseLmsPaymentTransaction.IRequest;
}): Promise<IPageIEnterpriseLmsPaymentTransaction.ISummary> {
  const { systemAdmin, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where = {
    deleted_at: null,
    ...(body.tenant_id !== undefined &&
      body.tenant_id !== null && { tenant_id: body.tenant_id }),
    ...(body.user_id !== undefined &&
      body.user_id !== null && { user_id: body.user_id }),
    ...(body.transaction_code !== undefined &&
      body.transaction_code !== null && {
        transaction_code: body.transaction_code,
      }),
    ...(body.currency !== undefined &&
      body.currency !== null && { currency: body.currency }),
    ...(body.payment_method !== undefined &&
      body.payment_method !== null && { payment_method: body.payment_method }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && { gte: body.created_at_from }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && { lte: body.created_at_to }),
          },
        }
      : {}),
    ...((body.amount_min !== undefined && body.amount_min !== null) ||
    (body.amount_max !== undefined && body.amount_max !== null)
      ? {
          amount: {
            ...(body.amount_min !== undefined &&
              body.amount_min !== null && { gte: body.amount_min }),
            ...(body.amount_max !== undefined &&
              body.amount_max !== null && { lte: body.amount_max }),
          },
        }
      : {}),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.enterprise_lms_payment_transactions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.enterprise_lms_payment_transactions.count({ where }),
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
      transaction_code: item.transaction_code,
      amount: item.amount,
      currency: item.currency,
      payment_method: item.payment_method,
      status: item.status,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
