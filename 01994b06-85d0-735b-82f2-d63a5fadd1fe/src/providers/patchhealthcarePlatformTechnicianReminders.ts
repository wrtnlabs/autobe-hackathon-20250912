import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReminder";
import { IPageIHealthcarePlatformReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformReminder";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Search and list reminders with filter, sorting, and pagination
 *
 * Obtains a filtered and paginated list of reminders for the technician's
 * organization, supporting advanced filtering, sorting, and paging criteria.
 * Results include only reminders in the authenticated technician's assigned
 * organization.
 *
 * @param props - Operation parameters
 * @param props.technician - Authentication payload for technician role (must be
 *   assigned to an organization)
 * @param props.body - Request filters for searching reminders (recipient,
 *   organization, date windows, etc)
 * @returns Paginated result set of reminder summary records matching criteria
 * @throws {Error} If technician is not assigned to an organization.
 */
export async function patchhealthcarePlatformTechnicianReminders(props: {
  technician: TechnicianPayload;
  body: IHealthcarePlatformReminder.IRequest;
}): Promise<IPageIHealthcarePlatformReminder.ISummary> {
  const { technician, body } = props;

  // Fetch technician's organization assignment
  const orgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: technician.id,
        deleted_at: null,
      },
      select: {
        healthcare_platform_organization_id: true,
      },
    });
  if (!orgAssignment) {
    throw new Error("Technician is not assigned to any organization.");
  }
  const organization_id: string =
    orgAssignment.healthcare_platform_organization_id;

  // WHERE clause: always restrict to technician's org and active reminders
  const where: Record<string, unknown> = {
    deleted_at: null,
    organization_id: organization_id,
    ...(body.target_user_id !== undefined &&
      body.target_user_id !== null && {
        target_user_id: body.target_user_id,
      }),
    ...(body.reminder_type !== undefined && {
      reminder_type: { contains: body.reminder_type },
    }),
    ...(body.reminder_message !== undefined && {
      reminder_message: { contains: body.reminder_message },
    }),
    ...(body.status !== undefined && {
      status: body.status,
    }),
    ...(body.failure_reason !== undefined && {
      failure_reason: { contains: body.failure_reason },
    }),
    // Time window filtering
    ...(body.scheduled_for_from !== undefined ||
    body.scheduled_for_to !== undefined
      ? {
          scheduled_for: {
            ...(body.scheduled_for_from !== undefined && {
              gte: body.scheduled_for_from,
            }),
            ...(body.scheduled_for_to !== undefined && {
              lte: body.scheduled_for_to,
            }),
          },
        }
      : {}),
    ...(body.delivered_at_from !== undefined ||
    body.delivered_at_to !== undefined
      ? {
          delivered_at: {
            ...(body.delivered_at_from !== undefined && {
              gte: body.delivered_at_from,
            }),
            ...(body.delivered_at_to !== undefined && {
              lte: body.delivered_at_to,
            }),
          },
        }
      : {}),
    ...(body.acknowledged_at_from !== undefined ||
    body.acknowledged_at_to !== undefined
      ? {
          acknowledged_at: {
            ...(body.acknowledged_at_from !== undefined && {
              gte: body.acknowledged_at_from,
            }),
            ...(body.acknowledged_at_to !== undefined && {
              lte: body.acknowledged_at_to,
            }),
          },
        }
      : {}),
  };

  // Pagination controls
  const pageRaw = body.page ?? 1;
  const limitRaw = body.limit ?? 20;
  const page = Number(pageRaw);
  const limit = Number(limitRaw);
  const skip = (page - 1) * limit;

  // Allowed sorting fields
  const allowedSortFields = [
    "scheduled_for",
    "reminder_type",
    "target_user_id",
    "status",
  ];
  let orderBy: Record<string, "asc" | "desc"> = { scheduled_for: "desc" };
  if (body.sort) {
    const sortField = body.sort.replace(/^[-+]/, "");
    if (allowedSortFields.includes(sortField)) {
      orderBy = {
        [sortField]: body.sort.startsWith("-") ? "desc" : "asc",
      };
    }
  }

  // Query data & count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_reminders.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        reminder_type: true,
        reminder_message: true,
        scheduled_for: true,
        status: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_reminders.count({ where }),
  ]);

  // Transform to ISummary with branded date/time values
  const data = rows.map((reminder) => ({
    id: reminder.id,
    reminder_type: reminder.reminder_type,
    reminder_message: reminder.reminder_message,
    scheduled_for: toISOStringSafe(reminder.scheduled_for),
    status: reminder.status,
  }));

  // Pagination output with correct tag-stripped values
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
