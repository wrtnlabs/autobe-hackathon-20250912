import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentReminder";
import { IPageIHealthcarePlatformAppointmentReminder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentReminder";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

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
 * Business logic ensures that only users with access rights to the appointment
 * (organization admin, etc.) can access the reminder history.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated organization admin user
 *   making the request
 * @param props.appointmentId - Unique identifier of the target appointment
 *   whose reminders to list
 * @param props.body - Search, filter, and pagination criteria for reminder
 *   retrieval
 * @returns Paginated list of reminder notification records for the given
 *   appointment.
 * @throws {Error} When appointment is not found or access is denied
 */
export async function patchhealthcarePlatformOrganizationAdminAppointmentsAppointmentIdReminders(props: {
  organizationAdmin: OrganizationadminPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentReminder.IRequest;
}): Promise<IPageIHealthcarePlatformAppointmentReminder> {
  const { organizationAdmin, appointmentId, body } = props;

  // 1. Lookup appointment and check org access
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { id: appointmentId },
      select: { id: true, healthcare_platform_organization_id: true },
    });
  if (!appointment) throw new Error("Appointment not found");

  // Hard access control: Only allow org admin whose org matches; if not found, access denied
  // We'll lookup org_id of the admin from the org assignment; we need to find which org(s) this admin is associated with
  const adminOrgAssignments =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findMany({
      where: {
        user_id: organizationAdmin.id,
      },
      select: { healthcare_platform_organization_id: true },
    });
  if (
    !adminOrgAssignments.some(
      (x) =>
        x.healthcare_platform_organization_id ===
        appointment.healthcare_platform_organization_id,
    )
  )
    throw new Error("Access denied to this appointment's reminders.");

  // 2. Setup pagination and filters (with validation/defaults)
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // 3. Build "where" query - always restrict to this appointment_id
  const where: Record<string, unknown> = {
    appointment_id: appointmentId,
    // ONLY add non-undefined filters for fields supported
    ...(body.recipient_type !== undefined &&
      body.recipient_type !== null && {
        recipient_type: body.recipient_type,
      }),
    ...(body.recipient_id !== undefined &&
      body.recipient_id !== null && {
        recipient_id: body.recipient_id,
      }),
    ...(body.delivery_channel !== undefined &&
      body.delivery_channel !== null && {
        delivery_channel: body.delivery_channel,
      }),
    ...(body.delivery_status !== undefined &&
      body.delivery_status !== null && {
        delivery_status: body.delivery_status,
      }),
    ...(body.reminder_time_from !== undefined &&
      body.reminder_time_from !== null && {
        reminder_time: {
          gte: body.reminder_time_from,
          ...(body.reminder_time_to !== undefined &&
          body.reminder_time_to !== null
            ? { lte: body.reminder_time_to }
            : {}),
        },
      }),
    // If only reminder_time_to is set (without from), still support
    ...(body.reminder_time_from === undefined &&
      body.reminder_time_to !== undefined &&
      body.reminder_time_to !== null && {
        reminder_time: { lte: body.reminder_time_to },
      }),
  };

  // 4. Supported sorting fields
  const allowedSortFields = ["reminder_time", "created_at", "updated_at"];
  const sortBy =
    typeof body.sort_by === "string" && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "reminder_time";
  const sortDirection = body.sort_direction === "desc" ? "desc" : "asc";

  // 5. Query reminders and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_appointment_reminders.findMany({
      where: where,
      orderBy: { [sortBy]: sortDirection },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_appointment_reminders.count({ where }),
  ]);

  // 6. Map dates using toISOStringSafe and return paginated result (no Date anywhere)
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data: rows.map((reminder) => ({
      id: reminder.id,
      appointment_id: reminder.appointment_id,
      reminder_time: toISOStringSafe(reminder.reminder_time),
      recipient_type: reminder.recipient_type,
      recipient_id: reminder.recipient_id,
      delivery_channel: reminder.delivery_channel,
      delivery_status: reminder.delivery_status,
      created_at: toISOStringSafe(reminder.created_at),
      updated_at: toISOStringSafe(reminder.updated_at),
    })),
  };
}
