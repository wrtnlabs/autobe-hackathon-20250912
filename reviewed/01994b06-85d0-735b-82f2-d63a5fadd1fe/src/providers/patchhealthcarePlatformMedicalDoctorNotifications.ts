import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotification";
import { IPageIHealthcarePlatformNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformNotification";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Search and retrieve notifications with advanced filtering and pagination
 * (Notifications table).
 *
 * This endpoint retrieves a paginated, filtered, and sorted list of
 * notification events for the authenticated medical doctor in the
 * healthcarePlatform system. Results are scope-limited to only include
 * notifications where the recipient is the currently authenticated medical
 * doctor (recipient_user_id). Supports all standard filters (type, channel,
 * status, critical flag, date windows, etc.).
 *
 * Only authorized and accessible notifications are returned (strict access to
 * notifications for this medical doctor only). Output is in summary DTO format,
 * ready for paginated list display, with no direct Date usage and proper data
 * type branding.
 *
 * @param props - The request properties
 * @param props.medicalDoctor - Authenticated MedicaldoctorPayload (must contain
 *   id)
 * @param props.body - Notification search filter (see IRequest)
 * @returns Paginated notification summary list for this medical doctor
 * @throws {Error} If any database or type error occurs
 */
export async function patchhealthcarePlatformMedicalDoctorNotifications(props: {
  medicalDoctor: MedicaldoctorPayload;
  body: IHealthcarePlatformNotification.IRequest;
}): Promise<IPageIHealthcarePlatformNotification.ISummary> {
  const { medicalDoctor, body } = props;

  // Enforce pagination boundaries (min page=1, min limit=1, max limit=100 for safety)
  const unsafePage = body.page ?? 1;
  const page = unsafePage > 0 ? unsafePage : 1;
  const unsafeLimit = body.limit ?? 20;
  const limit = unsafeLimit >= 1 && unsafeLimit <= 100 ? unsafeLimit : 20;
  const skip = (page - 1) * limit;

  // Allow only sortable fields that are safe and exist in schema
  const allowedSortFields = ["created_at", "delivery_status", "critical"];
  const sortField =
    body.sortField && allowedSortFields.includes(body.sortField)
      ? body.sortField
      : "created_at";
  const sortOrder = body.sortOrder === "asc" ? "asc" : "desc";

  // Build strict where clause strictly from schema and authorized fields
  const where = {
    deleted_at: null,
    recipient_user_id: medicalDoctor.id,
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
    ...(body.startDate !== undefined &&
      body.startDate !== null && { created_at: { gte: body.startDate } }),
    ...(body.endDate !== undefined &&
      body.endDate !== null && {
        created_at: {
          ...(body.startDate !== undefined &&
            body.startDate !== null && { gte: body.startDate }),
          lte: body.endDate,
        },
      }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_notifications.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
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

  const data = rows.map((row) => {
    return {
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
    };
  });

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
