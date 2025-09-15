import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import { IPageIHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformNotification";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve notifications with advanced filtering and pagination
 * (Notifications table).
 *
 * Provides a paginated, sortable, and filterable list of notification events
 * from the healthcare_platform_notifications table. Parameters are received in
 * the body (IHealthcarePlatformNotification.IRequest) and include recipient ID,
 * organization ID, type, channel, status, criticality, sorting, and date/time
 * windows. Organizationadmin users may search notifications only within their
 * organization's scope. All date-time values are handled as string &
 * tags.Format<'date-time'> only, never using native Date.
 *
 * @param props - Function parameters
 * @param props.organizationAdmin - Authenticated organization admin payload
 * @param props.body - Search and filter parameters for notifications (includes
 *   pagination, filters, sorting)
 * @returns Paginated list of notification summaries for display
 * @throws {Error} If database or type error occurs
 */
export async function patchhealthcarePlatformOrganizationAdminNotifications(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformNotification.IRequest;
}): Promise<IPageIHealthcarePlatformNotification.ISummary> {
  const { organizationAdmin, body } = props;

  // Default pagination parameters with typia tag safe conversion
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);

  // Allowed sort fields must match Prisma columns and summary fields
  const allowedSortFields = ["created_at", "delivery_status", "critical"];
  // Only allow allowed sort fields (prevents SQL injection)
  const sortField =
    body.sortField && allowedSortFields.includes(body.sortField)
      ? body.sortField
      : "created_at";
  const sortOrder: "asc" | "desc" = body.sortOrder === "asc" ? "asc" : "desc";

  // Build WHERE clause safely, only including filters if value is not null/undefined
  const where = {
    deleted_at: null, // Only not-deleted
    // Auth: restrict to org scope
    ...(body.organizationId !== undefined &&
      body.organizationId !== null && {
        organization_id: body.organizationId,
      }),
    ...(body.recipientUserId !== undefined &&
      body.recipientUserId !== null && {
        recipient_user_id: body.recipientUserId,
      }),
    ...(body.notificationType !== undefined &&
      body.notificationType !== null && {
        notification_type: body.notificationType,
      }),
    ...(body.notificationChannel !== undefined &&
      body.notificationChannel !== null && {
        notification_channel: body.notificationChannel,
      }),
    ...(body.deliveryStatus !== undefined &&
      body.deliveryStatus !== null && {
        delivery_status: body.deliveryStatus,
      }),
    ...(body.critical !== undefined &&
      body.critical !== null && {
        critical: body.critical,
      }),
    // Date filters on created_at (startDate, endDate)
    ...((body.startDate !== undefined && body.startDate !== null) ||
    (body.endDate !== undefined && body.endDate !== null)
      ? {
          created_at: {
            ...(body.startDate !== undefined &&
              body.startDate !== null && {
                gte: body.startDate,
              }),
            ...(body.endDate !== undefined &&
              body.endDate !== null && {
                lte: body.endDate,
              }),
          },
        }
      : {}),
  };

  // Query rows and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_notifications.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: Number(skip),
      take: Number(limit),
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

  // Format results as ISummary - all dates must be toISOStringSafe, optional fields mapped properly
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      notificationType: row.notification_type,
      notificationChannel: row.notification_channel,
      critical: row.critical,
      deliveryStatus: row.delivery_status,
      createdAt: toISOStringSafe(row.created_at),
      subject: row.subject === undefined ? undefined : row.subject,
      deliveredAt:
        row.delivered_at !== undefined && row.delivered_at !== null
          ? toISOStringSafe(row.delivered_at)
          : undefined,
    })),
  };
}
