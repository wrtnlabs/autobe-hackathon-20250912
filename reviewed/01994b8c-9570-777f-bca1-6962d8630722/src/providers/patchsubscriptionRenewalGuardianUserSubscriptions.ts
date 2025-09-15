import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ISubscriptionRenewalGuardianSubscriptions } from "@ORGANIZATION/PROJECT-api/lib/structures/ISubscriptionRenewalGuardianSubscriptions";
import { IPageISubscriptionRenewalGuardianSubscriptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageISubscriptionRenewalGuardianSubscriptions";
import { UserPayload } from "../decorators/payload/UserPayload";

/**
 * Retrieves a paginated list of subscriptions belonging to the authenticated
 * user.
 *
 * Applies filters for status, vendor_id, plan_name, and a general search string
 * which searches both plan_name and vendor name fields.
 *
 * Supports sorting by next_renewal_at in ascending or descending order, and
 * paginates results with page and limit parameters.
 *
 * All date-time fields are safely converted to ISO string format.
 *
 * @param props - Object containing the authenticated user and request body
 *   filters
 * @param props.user - Authenticated user payload with user ID
 * @param props.body - Filtering, sorting, and pagination request parameters
 * @returns A paginated summary of user's subscription records matching filter
 *   criteria
 * @throws Error if database queries fail or invalid parameters are provided
 */
export async function patchsubscriptionRenewalGuardianUserSubscriptions(props: {
  user: UserPayload;
  body: ISubscriptionRenewalGuardianSubscriptions.IRequest;
}): Promise<IPageISubscriptionRenewalGuardianSubscriptions.ISummary> {
  const { user, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const skip = (page - 1) * limit;

  const whereConditions = {
    user_id: user.id,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.vendor_id !== undefined &&
      body.vendor_id !== null && { vendor_id: body.vendor_id }),
    ...(body.plan_name !== undefined &&
      body.plan_name !== null && { plan_name: { contains: body.plan_name } }),
    ...(body.search !== undefined &&
      body.search !== null && {
        OR: [
          { plan_name: { contains: body.search } },
          { vendor: { name: { contains: body.search } } },
        ],
      }),
  };

  const [results, total] = await Promise.all([
    MyGlobal.prisma.subscription_renewal_guardian_subscriptions.findMany({
      where: whereConditions,
      orderBy: {
        next_renewal_at: body.sortOrder === "asc" ? "asc" : "desc",
      },
      skip,
      take: limit,
      select: {
        id: true,
        plan_name: true,
        billing_cycle: true,
        amount: true,
        currency: true,
        next_renewal_at: true,
        status: true,
        notes: true,
      },
    }),
    MyGlobal.prisma.subscription_renewal_guardian_subscriptions.count({
      where: whereConditions,
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
      plan_name: item.plan_name,
      billing_cycle: item.billing_cycle as
        | "DAILY"
        | "WEEKLY"
        | "MONTHLY"
        | "YEARLY",
      amount: item.amount,
      currency: item.currency,
      next_renewal_at: toISOStringSafe(item.next_renewal_at),
      status: item.status as "ACTIVE" | "PAUSED" | "CANCELED",
      notes: item.notes ?? null,
    })),
  };
}
