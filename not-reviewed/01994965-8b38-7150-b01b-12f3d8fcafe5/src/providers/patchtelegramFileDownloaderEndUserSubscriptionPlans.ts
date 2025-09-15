import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITelegramFileDownloaderSubscriptionPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderSubscriptionPlans";
import { IPageITelegramFileDownloaderSubscriptionPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderSubscriptionPlans";
import { EnduserPayload } from "../decorators/payload/EnduserPayload";

/**
 * Searches and retrieves a filtered and paginated list of subscription plans
 * for endUsers.
 *
 * This operation allows authenticated endUsers to query subscription plans
 * using multiple filtering criteria, including code, name, price, and status.
 * Pagination is supported to control the result size.
 *
 * @param props - Object containing the authenticated endUser and search
 *   criteria
 * @param props.endUser - The authenticated endUser making the request
 * @param props.body - The search criteria and pagination parameters
 * @returns A paginated list of subscription plans matching the search criteria
 * @throws {Error} When database operation fails
 */
export async function patchtelegramFileDownloaderEndUserSubscriptionPlans(props: {
  endUser: EnduserPayload;
  body: ITelegramFileDownloaderSubscriptionPlans.IRequest;
}): Promise<IPageITelegramFileDownloaderSubscriptionPlans> {
  const { endUser, body } = props;

  // Default pagination values
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  // Build Prisma where filter
  const where = {
    deleted_at: null,
    ...(body.code !== undefined && body.code !== null
      ? { code: { contains: body.code } }
      : {}),
    ...(body.name !== undefined && body.name !== null
      ? { name: { contains: body.name } }
      : {}),
    ...(body.status !== undefined && body.status !== null
      ? { status: { contains: body.status } }
      : {}),
    ...(body.price !== undefined && body.price !== null
      ? { price: body.price }
      : {}),
    ...(body.max_files_per_day !== undefined && body.max_files_per_day !== null
      ? { max_files_per_day: body.max_files_per_day }
      : {}),
    ...(body.max_file_size_mb !== undefined && body.max_file_size_mb !== null
      ? { max_file_size_mb: body.max_file_size_mb }
      : {}),
    ...(body.total_storage_mb !== undefined && body.total_storage_mb !== null
      ? { total_storage_mb: body.total_storage_mb }
      : {}),
  };

  // Fetch subscription plans and total count
  const [plans, total] = await Promise.all([
    MyGlobal.prisma.telegram_file_downloader_subscription_plans.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.telegram_file_downloader_subscription_plans.count({
      where,
    }),
  ]);

  // Return paginated result with converted date strings and branded IDs
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: plans.map((plan) => ({
      id: plan.id as string & tags.Format<"uuid">,
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
    })),
  };
}
