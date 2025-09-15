import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import { IPageIHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformNotification";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Search and retrieve notifications with advanced filtering and pagination
 * (Notifications table).
 *
 * This function retrieves a paginated, filtered, and sorted list of
 * notification events for the given authenticated patient. Only the patient's
 * own notifications are accessible, respecting organization, privacy, and all
 * filter/pagination parameters. Does not expose notification body field in
 * summary.
 *
 * @param props - patient: Authenticated patient payload (only their own
 *   notifications) body: Notification search and filter criteria
 * @returns Paginated summary result object listing all matching notification
 *   summaries
 * @throws Error if invalid input values or internal DB error
 */
export async function patchhealthcarePlatformPatientNotifications(props: {
  patient: PatientPayload;
  body: IHealthcarePlatformNotification.IRequest;
}): Promise<IPageIHealthcarePlatformNotification.ISummary> {
  const { patient, body } = props;

  // Only allow retrieving own notifications
  if (
    typeof body.recipientUserId !== "undefined" &&
    body.recipientUserId !== patient.id
  ) {
    // Forbidden: patient cannot access other user's notifications
    return {
      pagination: { current: 1, limit: 10, records: 0, pages: 0 },
      data: [],
    };
  }

  // Filter construction
  const where: Record<string, any> = {
    deleted_at: null,
    recipient_user_id: patient.id,
    ...(body.organizationId !== undefined && {
      organization_id: body.organizationId,
    }),
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
  };
  // Date range filter for created_at
  if (body.startDate !== undefined || body.endDate !== undefined) {
    where.created_at = {
      ...(body.startDate !== undefined && { gte: body.startDate }),
      ...(body.endDate !== undefined && { lte: body.endDate }),
    };
  }

  // Sort logic: allowlist only
  const allowedSortFields = ["createdAt", "deliveryStatus", "critical"];
  const sortField = allowedSortFields.includes(body.sortField ?? "")
    ? body.sortField
    : "createdAt";
  const prismaSortField =
    sortField === "deliveryStatus"
      ? "delivery_status"
      : sortField === "critical"
        ? "critical"
        : "created_at";
  const sortOrder = body.sortOrder === "asc" ? "asc" : "desc";

  // Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Query notifications and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_notifications.findMany({
      where,
      orderBy: { [prismaSortField]: sortOrder },
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

  // Assemble the ISummary data array
  const data = rows.map((row) => {
    const summary: IHealthcarePlatformNotification.ISummary = {
      id: row.id,
      notificationType: row.notification_type,
      notificationChannel: row.notification_channel,
      critical: row.critical,
      deliveryStatus: row.delivery_status,
      createdAt: toISOStringSafe(row.created_at),
      // Optional/nullable: only include if not null
      ...(row.subject !== null && { subject: row.subject }),
      ...(row.delivered_at !== null && {
        deliveredAt: toISOStringSafe(row.delivered_at),
      }),
    };
    return summary;
  });

  const pages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
    data,
  };
}
