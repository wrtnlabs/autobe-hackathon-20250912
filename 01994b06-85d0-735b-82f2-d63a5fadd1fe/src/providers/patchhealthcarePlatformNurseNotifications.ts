import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import { IPageIHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformNotification";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Search and retrieve notifications with advanced filtering and pagination
 * (Notifications table).
 *
 * This endpoint allows an authenticated nurse to retrieve a paginated list of
 * notifications addressed to them. Advanced filtering is supported for
 * notification type, delivery channel, criticality, status, and creation date
 * windows. Sorting and pagination may be customized using request body
 * options.
 *
 * Security: Only notifications where the nurse is the recipient will be shown.
 *
 * @param props - Request properties
 * @param props.nurse - Authenticated nurse user (role: nurse)
 * @param props.body - Notification search and filter criteria, including
 *   sorting and pagination
 * @returns Paginated summary list of notifications addressed to the nurse
 * @throws {Error} If an internal error occurs or invalid sort field/order is
 *   supplied
 */
export async function patchhealthcarePlatformNurseNotifications(props: {
  nurse: NursePayload;
  body: IHealthcarePlatformNotification.IRequest;
}): Promise<IPageIHealthcarePlatformNotification.ISummary> {
  const { nurse, body } = props;
  // Pagination and defaults
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Sorting whitelist for notification summary allowed fields
  const allowedSortFields = [
    "created_at",
    "delivery_status",
    "critical",
    "delivered_at",
    "notification_type",
    "notification_channel",
  ];
  // Defensive literal narrowing
  const orderByField =
    typeof body.sortField === "string" &&
    allowedSortFields.includes(body.sortField)
      ? body.sortField
      : "created_at";
  const orderByDirection =
    body.sortOrder === "asc" || body.sortOrder === "desc"
      ? body.sortOrder
      : "desc";

  // Build where condition (immutable, only nurse's own notifications)
  const where = {
    deleted_at: null,
    recipient_user_id: nurse.id,
    ...(body.notificationType !== undefined && {
      notification_type: body.notificationType,
    }),
    ...(body.notificationChannel !== undefined && {
      notification_channel: body.notificationChannel,
    }),
    ...(body.deliveryStatus !== undefined && {
      delivery_status: body.deliveryStatus,
    }),
    ...(body.critical !== undefined && { critical: body.critical }),
    ...(body.organizationId !== undefined && {
      organization_id: body.organizationId,
    }),
    ...(body.recipientUserId !== undefined && {
      recipient_user_id: body.recipientUserId,
    }),
    // Date window filtering
    ...(body.startDate !== undefined && body.endDate !== undefined
      ? { created_at: { gte: body.startDate, lte: body.endDate } }
      : body.startDate !== undefined
        ? { created_at: { gte: body.startDate } }
        : body.endDate !== undefined
          ? { created_at: { lte: body.endDate } }
          : {}),
  };

  // Query notifications and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_notifications.findMany({
      where,
      orderBy: { [orderByField]: orderByDirection },
      skip,
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

  // Format results with date branding
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
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
    })),
  };
}
