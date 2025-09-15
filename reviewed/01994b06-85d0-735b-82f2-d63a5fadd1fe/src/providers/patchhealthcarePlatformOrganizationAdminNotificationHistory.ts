import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformNotificationHistory";
import { IPageIHealthcarePlatformNotificationHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformNotificationHistory";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and filter notification delivery history
 * (healthcare_platform_notification_history table).
 *
 * This endpoint allows an organization admin to search and retrieve paginated
 * system notification delivery history events. Supports advanced filtering by
 * notification, type, channel, status, and time window, while enforcing strict
 * organization boundaries. Results are paginated and can be sorted by a subset
 * of supported fields. All date fields are returned as ISO 8601-formatted
 * strings.
 *
 * @param props - Request object containing the authenticated organization admin
 *   (organizationAdmin) and the search/filter body
 * @param props.organizationAdmin - OrganizationadminPayload of the requesting
 *   admin
 * @param props.body - IHealthcarePlatformNotificationHistory.IRequest
 *   (search/filter criteria with pagination)
 * @returns Paginated notification delivery history records (with pagination
 *   meta data)
 * @throws {Error} If admin is not found or deleted, or if provided sortField is
 *   not supported
 */
export async function patchhealthcarePlatformOrganizationAdminNotificationHistory(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformNotificationHistory.IRequest;
}): Promise<IPageIHealthcarePlatformNotificationHistory> {
  const { organizationAdmin, body } = props;

  // Validate and look up admin organization
  const adminRow =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: { id: organizationAdmin.id, deleted_at: null },
      select: { id: true },
    });
  if (!adminRow) {
    throw new Error("Not found or deleted: organization admin");
  }

  // Find all notifications for this admin's organization (must match org boundary)
  const notificationRows =
    await MyGlobal.prisma.healthcare_platform_notifications.findMany({
      where: { organization_id: adminRow.id, deleted_at: null },
      select: { id: true },
    });
  const notificationIdSet = new Set(notificationRows.map((n) => n.id));
  if (notificationIdSet.size === 0) {
    return {
      pagination: {
        current: Number(body.page ?? 1),
        limit: Number(body.pageSize ?? 50),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  // Sanitize pagination input
  const page = body.page ?? 1;
  const pageSize = body.pageSize ?? 50;
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // Build where clause (only for allowed fields)
  const where: Record<string, unknown> = {
    ...(body.notificationId !== undefined && {
      notification_id: body.notificationId,
    }),
    ...(body.eventType !== undefined && { event_type: body.eventType }),
    ...(body.deliveryStatus !== undefined && {
      delivery_status: body.deliveryStatus,
    }),
    ...(body.deliveryChannel !== undefined && {
      delivery_channel: body.deliveryChannel,
    }),
    ...(body.eventTimeFrom !== undefined && {
      event_time: { gte: body.eventTimeFrom },
    }),
    ...(body.eventTimeTo !== undefined && {
      event_time: { lte: body.eventTimeTo },
    }),
    notification_id: { in: Array.from(notificationIdSet) },
  };

  // Safelist for supported sortField (no user-controlled injection)
  const allowedSortFields = ["event_time", "created_at", "id"];
  const sortField = allowedSortFields.includes(body.sortField ?? "")
    ? body.sortField!
    : "created_at";
  const sortOrder = body.sortOrder === "asc" ? "asc" : "desc";
  const orderBy = { [sortField]: sortOrder };

  // Run queries in parallel for pagination
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_notification_history.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.healthcare_platform_notification_history.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
    },
    data: rows.map((ev) => ({
      id: ev.id,
      notification_id: ev.notification_id,
      event_type: ev.event_type,
      event_time: toISOStringSafe(ev.event_time),
      delivery_channel: ev.delivery_channel,
      delivery_status: ev.delivery_status,
      details: ev.details === null ? undefined : ev.details,
      created_at: toISOStringSafe(ev.created_at),
    })),
  };
}
