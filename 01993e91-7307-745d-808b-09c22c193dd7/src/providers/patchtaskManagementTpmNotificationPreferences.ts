import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { ITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementNotificationPreferences";
import { IPageITaskManagementNotificationPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementNotificationPreferences";
import { TpmPayload } from "../decorators/payload/TpmPayload";

/**
 * Search notification preferences with filtering and pagination
 *
 * Retrieves task management notification preferences matching user-provided
 * filters including preference_key, delivery_method, and enabled status.
 * Results are paginated and scoped to the authenticated TPM user.
 *
 * @param props - Object containing authenticated TPM user and filter criteria
 * @param props.tpm - Authenticated TPM user payload for authorization and
 *   scoping
 * @param props.body - Notification preferences filter criteria and pagination
 * @returns Paginated response with filtered notification preference records
 * @throws {Error} Unexpected database or internal errors
 */
export async function patchtaskManagementTpmNotificationPreferences(props: {
  tpm: TpmPayload;
  body: ITaskManagementNotificationPreferences.IRequest;
}): Promise<IPageITaskManagementNotificationPreferences> {
  const { tpm, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const where = {
    user_id: tpm.id,
    ...(body.preference_key !== undefined &&
      body.preference_key !== null && {
        preference_key: body.preference_key,
      }),
    ...(body.enabled !== undefined &&
      body.enabled !== null && {
        enabled: body.enabled,
      }),
    ...(body.delivery_method !== undefined &&
      body.delivery_method !== null && {
        delivery_method: body.delivery_method,
      }),
  };

  const [items, total] = await Promise.all([
    MyGlobal.prisma.task_management_notification_preferences.findMany({
      where,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.task_management_notification_preferences.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: items.map((item) => ({
      id: item.id,
      user_id: item.user_id,
      preference_key: item.preference_key,
      enabled: item.enabled,
      delivery_method: item.delivery_method,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
    })),
  };
}
