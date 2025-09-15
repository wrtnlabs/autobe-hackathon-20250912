import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import { IPageITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotificationPreferences";
import { QaPayload } from "../decorators/payload/QaPayload";

/**
 * Search notification preferences with filtering and pagination.
 *
 * This operation enables QA users to query their notification preferences by
 * preference key, enabled flag, and delivery method with pagination.
 *
 * @param props - Object containing qa payload for authorization and search
 *   criteria in body
 * @param props.qa - Authenticated QA user performing the search
 * @param props.body - Search criteria and pagination parameters
 * @returns Paginated list of notification preferences matching the search
 *   criteria
 * @throws {Error} When filtering parameters are invalid
 */
export async function patchtaskManagementQaNotificationPreferences(props: {
  qa: QaPayload;
  body: ITaskManagementNotificationPreferences.IRequest;
}): Promise<IPageITaskManagementNotificationPreferences> {
  const { qa, body } = props;

  // Set default pagination values
  const page =
    body.page === undefined || body.page === null || body.page < 1
      ? 1
      : body.page;
  const limit =
    body.limit === undefined ||
    body.limit === null ||
    body.limit < 1 ||
    body.limit > 100
      ? 10
      : body.limit;
  const skip = (page - 1) * limit;

  // Build where condition based on provided filters
  const whereCondition: {
    preference_key?: { contains: string };
    enabled?: boolean;
    delivery_method?: { contains: string };
  } = {};

  if (body.preference_key !== undefined && body.preference_key !== null) {
    whereCondition.preference_key = { contains: body.preference_key };
  }
  if (body.enabled !== undefined && body.enabled !== null) {
    whereCondition.enabled = body.enabled;
  }
  if (body.delivery_method !== undefined && body.delivery_method !== null) {
    whereCondition.delivery_method = { contains: body.delivery_method };
  }

  // Execute prisma queries for filtered and paginated data
  const [dataRaw, total] = await Promise.all([
    MyGlobal.prisma.task_management_notification_preferences.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.task_management_notification_preferences.count({
      where: whereCondition,
    }),
  ]);

  // Map Prisma results to API DTO with date conversions
  const data = dataRaw.map((raw) => ({
    id: raw.id,
    user_id: raw.user_id,
    preference_key: raw.preference_key,
    enabled: raw.enabled,
    delivery_method: raw.delivery_method,
    created_at: toISOStringSafe(raw.created_at),
    updated_at: toISOStringSafe(raw.updated_at),
    deleted_at: raw.deleted_at ? toISOStringSafe(raw.deleted_at) : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
