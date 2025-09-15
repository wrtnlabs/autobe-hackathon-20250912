import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import { IPageIHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformNotification";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve notifications with advanced filtering and pagination
 * (Notifications table).
 *
 * This API operation provides an advanced search endpoint for notifications in
 * the healthcarePlatform system. Supports filtering by notification type,
 * delivery channel, status, recipient, organization, time window, and
 * criticality, with full pagination and sorting. Only results the user is
 * authorized to see are returned. The operation returns paginated summary
 * notification records following audit/compliance and data isolation policies.
 *
 * @param props - Object with systemAdmin authentication payload and
 *   notification search request body
 * @param props.systemAdmin - Authenticated system admin performing the search
 * @param props.body - Request body containing search criteria and
 *   pagination/sort options
 * @returns Paginated summary list of notifications matching the search
 *   parameters
 * @throws {Error} If search criteria are invalid, page/limit are out of allowed
 *   range, or query fails
 */
export async function patchhealthcarePlatformSystemAdminNotifications(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformNotification.IRequest;
}): Promise<IPageIHealthcarePlatformNotification.ISummary> {
  const { systemAdmin, body } = props;
  // Page/limit safe defaults and enforcement
  const page =
    typeof body.page === "number" && body.page >= 1 ? Number(body.page) : 1;
  const limit =
    typeof body.limit === "number" && body.limit >= 1
      ? Math.min(Number(body.limit), 100)
      : 20;

  // Where condition for Prisma
  const where: Record<string, unknown> = {
    deleted_at: null,
    ...(body.notificationType !== undefined &&
      body.notificationType !== null && {
        notification_type: body.notificationType,
      }),
    ...(body.notificationChannel !== undefined &&
      body.notificationChannel !== null && {
        notification_channel: body.notificationChannel,
      }),
    ...(body.recipientUserId !== undefined &&
      body.recipientUserId !== null && {
        recipient_user_id: body.recipientUserId,
      }),
    ...(body.organizationId !== undefined &&
      body.organizationId !== null && { organization_id: body.organizationId }),
    ...(body.deliveryStatus !== undefined &&
      body.deliveryStatus !== null && { delivery_status: body.deliveryStatus }),
    ...(typeof body.critical === "boolean" && { critical: body.critical }),
    ...((body.startDate !== undefined && body.startDate !== null) ||
    (body.endDate !== undefined && body.endDate !== null)
      ? {
          created_at: {
            ...(body.startDate !== undefined &&
              body.startDate !== null && { gte: body.startDate }),
            ...(body.endDate !== undefined &&
              body.endDate !== null && { lte: body.endDate }),
          },
        }
      : {}),
  };

  // Allowed sort fields
  const allowedSortFields = [
    "created_at",
    "delivery_status",
    "critical",
    "notification_type",
    "notification_channel",
  ];
  const sortField =
    typeof body.sortField === "string" &&
    allowedSortFields.includes(body.sortField)
      ? body.sortField
      : "created_at";
  const sortOrder =
    body.sortOrder === "asc" || body.sortOrder === "desc"
      ? body.sortOrder
      : "desc";

  // Queries
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

  // Result mapping
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
      subject: row.subject === null ? undefined : row.subject,
      deliveredAt:
        row.delivered_at === null || row.delivered_at === undefined
          ? undefined
          : toISOStringSafe(row.delivered_at),
    })),
  };
}
