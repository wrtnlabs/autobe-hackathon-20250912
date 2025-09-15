import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEscalationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEscalationEvent";
import { IPageIHealthcarePlatformEscalationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEscalationEvent";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a paginated list of escalation events from the
 * healthcare_platform_escalation_events table.
 *
 * This operation allows a system admin to perform advanced filtered search and
 * listing of escalation events across all organizations and roles. Results may
 * be filtered by notification ID, assigned user/role, escalation type, severity
 * level, deadline windows, creation time, and status. Permission: Only
 * authenticated SystemadminPayload users are authorized to access full
 * escalation event audit data platform-wide.
 *
 * @param props - Object containing system admin payload and search request
 * @param props.systemAdmin - The authenticated system admin
 *   (SystemadminPayload)
 * @param props.body - The search and pagination filter object
 * @returns Paginated summary of escalation events matching the query criteria
 */
export async function patchhealthcarePlatformSystemAdminEscalationEvents(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformEscalationEvent.IRequest;
}): Promise<IPageIHealthcarePlatformEscalationEvent.ISummary> {
  const { body } = props;
  const allowedSortFields = ["deadline_at", "created_at", "escalation_level"];
  const page = body.page ?? 1;
  const pageSize = body.pageSize ?? 50;
  const sortField = allowedSortFields.includes(body.sortField ?? "")
    ? (body.sortField as "deadline_at" | "created_at" | "escalation_level")
    : "deadline_at";
  const sortOrder = body.sortOrder === "asc" ? "asc" : "desc";

  const where = {
    ...(body.sourceNotificationId !== undefined && {
      source_notification_id: body.sourceNotificationId,
    }),
    ...(body.targetUserId !== undefined && {
      target_user_id: body.targetUserId,
    }),
    ...(body.targetRoleId !== undefined && {
      target_role_id: body.targetRoleId,
    }),
    ...(body.escalationType !== undefined && {
      escalation_type: body.escalationType,
    }),
    ...(body.escalationLevel !== undefined && {
      escalation_level: body.escalationLevel,
    }),
    ...(body.status !== undefined && { resolution_status: body.status }),
    ...(body.deadlineFrom !== undefined || body.deadlineTo !== undefined
      ? {
          deadline_at: {
            ...(body.deadlineFrom !== undefined && { gte: body.deadlineFrom }),
            ...(body.deadlineTo !== undefined && { lte: body.deadlineTo }),
          },
        }
      : {}),
    ...(body.createdAtFrom !== undefined || body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(body.createdAtFrom !== undefined && {
              gte: body.createdAtFrom,
            }),
            ...(body.createdAtTo !== undefined && { lte: body.createdAtTo }),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_escalation_events.findMany({
      where,
      orderBy: {
        [sortField]: sortOrder,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        escalation_type: true,
        escalation_level: true,
        deadline_at: true,
        resolution_status: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_escalation_events.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: rows.map((row) => ({
      id: row.id,
      escalation_type: row.escalation_type,
      escalation_level: row.escalation_level,
      deadline_at: toISOStringSafe(row.deadline_at),
      resolution_status: row.resolution_status,
    })),
  };
}
