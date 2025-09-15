import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { IPageIHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentReminder";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * List reminder notifications for an appointment (paginated/filterable)
 *
 * Retrieves all reminders (notification events) associated with a specific
 * appointment ID. Returned results may be filtered/paginated and include all
 * sent/pending/failed reminders, complete with recipient information, delivery
 * status, and notification metadata. Used for staff to monitor and troubleshoot
 * notification workflows, verify SLA compliance, or support patient/provider
 * inquiries.
 *
 * Only returns active (not soft-deleted) reminders associated with the
 * specified appointment. Enforces department head access rights by verifying
 * the department ID on the appointment.
 *
 * @param props - The request object containing:
 *
 *   - DepartmentHead: The authenticated department head user
 *   - AppointmentId: The unique identifier of the appointment to query reminders
 *       for
 *   - Body: Search and filter criteria for reminders (status, time window,
 *       recipient, channel, pagination/sorting)
 *
 * @returns Paginated list of IHealthcarePlatformAppointmentReminder objects,
 *   plus pagination metadata
 * @throws {Error} If the appointment does not exist or the user is not
 *   authorized to view it
 */
export async function patchhealthcarePlatformDepartmentHeadAppointmentsAppointmentIdReminders(props: {
  departmentHead: DepartmentheadPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentReminder.IRequest;
}): Promise<IPageIHealthcarePlatformAppointmentReminder> {
  const { departmentHead, appointmentId, body } = props;

  // 1. Authorize access to appointment: must exist and match department for departmentHead
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { id: appointmentId },
      select: { id: true, healthcare_platform_department_id: true },
    });
  if (!appointment) throw new Error("Appointment not found");
  // Enforce department access: the department ID must match departmentHead.id
  // (for multi-department heads, more complex relation may be implemented)
  if (
    !appointment.healthcare_platform_department_id ||
    appointment.healthcare_platform_department_id !== departmentHead.id
  )
    throw new Error(
      "Access denied: department head does not have permission for this appointment",
    );

  // 2. Prepare filters for reminders query
  const where: Record<string, unknown> = {
    appointment_id: appointmentId,
    deleted_at: null,
    ...(body.recipient_type !== undefined &&
      body.recipient_type !== null && { recipient_type: body.recipient_type }),
    ...(body.recipient_id !== undefined &&
      body.recipient_id !== null && { recipient_id: body.recipient_id }),
    ...(body.delivery_channel !== undefined &&
      body.delivery_channel !== null && {
        delivery_channel: body.delivery_channel,
      }),
    ...(body.delivery_status !== undefined &&
      body.delivery_status !== null && {
        delivery_status: body.delivery_status,
      }),
  };
  // Date range: must aggregate for reminder_time
  const reminderTimeRange =
    (body.reminder_time_from !== undefined &&
      body.reminder_time_from !== null) ||
    (body.reminder_time_to !== undefined && body.reminder_time_to !== null);
  if (reminderTimeRange) {
    where.reminder_time = {
      ...(body.reminder_time_from !== undefined &&
        body.reminder_time_from !== null && { gte: body.reminder_time_from }),
      ...(body.reminder_time_to !== undefined &&
        body.reminder_time_to !== null && { lte: body.reminder_time_to }),
    };
  }

  // 3. Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);

  // 4. Sorting: allow only fixed set of sortable fields
  const ALLOWED_SORT_COLUMNS: ReadonlyArray<string> = [
    "reminder_time",
    "created_at",
    "updated_at",
    "delivery_status",
    "delivery_channel",
    "recipient_type",
  ];
  let sort_by = "reminder_time";
  if (
    typeof body.sort_by === "string" &&
    ALLOWED_SORT_COLUMNS.includes(body.sort_by)
  )
    sort_by = body.sort_by;
  let sort_direction: "asc" | "desc" = "desc";
  if (body.sort_direction === "asc" || body.sort_direction === "desc")
    sort_direction = body.sort_direction;

  // 5. Main query
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_appointment_reminders.findMany({
      where,
      orderBy: { [sort_by]: sort_direction },
      skip,
      take: Number(limit),
    }),
    MyGlobal.prisma.healthcare_platform_appointment_reminders.count({ where }),
  ]);

  // 6. Transform rows to DTOs with all date conversions
  const data = rows.map(
    (row): IHealthcarePlatformAppointmentReminder => ({
      id: row.id,
      appointment_id: row.appointment_id,
      reminder_time: toISOStringSafe(row.reminder_time),
      recipient_type: row.recipient_type,
      recipient_id: row.recipient_id,
      delivery_channel: row.delivery_channel,
      delivery_status: row.delivery_status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    }),
  );

  const result: IPageIHealthcarePlatformAppointmentReminder = {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
  return result;
}
