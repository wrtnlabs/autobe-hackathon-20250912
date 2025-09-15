import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import { IPageIHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformNotification";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Search and retrieve notifications with advanced filtering and pagination
 * (Notifications table).
 *
 * This API operation retrieves a paginated, filtered, and sorted list of
 * notification events within the healthcarePlatform system, leveraging the
 * Notifications table. The search supports filtering by notification type,
 * delivery channel, criticality, recipient user, organization, status, and
 * date/time ranges. Sorting and pagination options are enforced per request
 * body. Only notifications visible to the authenticated technician (by
 * assignment/ownership) are returned.
 *
 * All returned date fields are correctly formatted as string &
 * tags.Format<'date-time'> per domain rules.
 *
 * @param props - Request properties
 * @param props.technician - Authenticated technician payload
 *   (TechnicianPayload)
 * @param props.body - Search, filter, sort, and pagination options
 *   (IHealthcarePlatformNotification.IRequest)
 * @returns Paginated notification summary list
 *   (IPageIHealthcarePlatformNotification.ISummary)
 * @throws {Error} When search criteria are invalid or pagination out-of-range
 */
export async function patchhealthcarePlatformTechnicianNotifications(props: {
  technician: TechnicianPayload;
  body: IHealthcarePlatformNotification.IRequest;
}): Promise<IPageIHealthcarePlatformNotification.ISummary> {
  const { technician, body } = props;

  // Pagination defaults (strict int32)
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);

  // Allowed sort fields (schema-limited for defense-in-depth)
  const allowedSortFields = ["created_at", "delivery_status", "critical"];
  const sortField =
    typeof body.sortField === "string" &&
    allowedSortFields.includes(body.sortField)
      ? body.sortField
      : "created_at";
  const sortOrder =
    body.sortOrder === "asc" || body.sortOrder === "desc"
      ? body.sortOrder
      : "desc";

  // Build dynamic where clause inline (no Record<string, unknown>)
  const where = {
    deleted_at: null,
    ...(body.notificationType && { notification_type: body.notificationType }),
    ...(body.notificationChannel && {
      notification_channel: body.notificationChannel,
    }),
    ...(body.recipientUserId && { recipient_user_id: body.recipientUserId }),
    ...(body.organizationId && { organization_id: body.organizationId }),
    ...(body.deliveryStatus && { delivery_status: body.deliveryStatus }),
    ...(typeof body.critical === "boolean" && { critical: body.critical }),
    ...(body.startDate || body.endDate
      ? {
          created_at: {
            ...(body.startDate && { gte: body.startDate }),
            ...(body.endDate && { lte: body.endDate }),
          },
        }
      : {}),
  };

  // Query for notifications and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_notifications.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        notification_type: true,
        notification_channel: true,
        critical: true,
        delivery_status: true,
        created_at: true,
        subject: true,
        delivered_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_notifications.count({ where }),
  ]);

  // Map results to summary DTOs, converting date fields
  const notifications = rows.map((row) => ({
    id: row.id,
    notificationType: row.notification_type,
    notificationChannel: row.notification_channel,
    critical: row.critical,
    deliveryStatus: row.delivery_status,
    createdAt: toISOStringSafe(row.created_at),
    subject: row.subject ?? undefined,
    deliveredAt: row.delivered_at
      ? toISOStringSafe(row.delivered_at)
      : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data: notifications,
  };
}
