import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { IPageIHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentWaitlist";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve the waitlist for a given appointment from the appointment waitlists
 * table.
 *
 * This endpoint provides a paginated and filterable list of all entries on the
 * waitlist for a specified appointment within the healthcare platform. It
 * supports organization admin staff in viewing and managing the waitlist,
 * applying filters on status, patient, and join time. Only active (not deleted)
 * waitlist entries are included, ensuring compliance with privacy and audit
 * requirements. Callers must be authenticated as an organization admin and will
 * receive paginated summary data for workflow coordination.
 *
 * @param props - Request parameters
 * @param props.organizationAdmin - Authenticated organization admin making the
 *   request
 * @param props.appointmentId - UUID of the appointment for which to retrieve
 *   the waitlist
 * @param props.body - Query and pagination/filter parameters for searching the
 *   waitlist
 * @returns Paginated list of summary entries on the appointment's waitlist
 * @throws {Error} If the specified appointment does not exist or is
 *   inaccessible
 */
export async function patchhealthcarePlatformOrganizationAdminAppointmentsAppointmentIdWaitlists(props: {
  organizationAdmin: OrganizationadminPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.IRequest;
}): Promise<IPageIHealthcarePlatformAppointmentWaitlist.ISummary> {
  const { organizationAdmin, appointmentId, body } = props;

  // Ensure the appointment exists
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { id: appointmentId },
    });
  if (!appointment) {
    throw new Error("Appointment not found");
  }

  // Pagination setup (safe conversion for DTO branding)
  const page = body.page ?? 1;
  const limit = body.page_size ?? 20;
  const skip = (page - 1) * limit;

  // Build where conditions for Prisma query
  const where: Record<string, unknown> = {
    appointment_id: appointmentId,
    // Filter by status if provided
    ...(body.status !== undefined && { status: body.status }),
    // Filter by patient_id if provided
    ...(body.patient_id !== undefined && { patient_id: body.patient_id }),
    // Join time range (gte/lte)
    ...(body.join_time_from !== undefined || body.join_time_to !== undefined
      ? {
          join_time: {
            ...(body.join_time_from !== undefined && {
              gte: body.join_time_from,
            }),
            ...(body.join_time_to !== undefined && { lte: body.join_time_to }),
          },
        }
      : {}),
    // Exclude soft-deleted items if deleted_at exists
    deleted_at: null,
  };

  // Query rows and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_appointment_waitlists.findMany({
      where,
      orderBy: { join_time: "asc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_appointment_waitlists.count({ where }),
  ]);

  // Map database rows to API summary type, converting Date fields with toISOStringSafe
  const data = rows.map((row) => ({
    id: row.id,
    appointment_id: row.appointment_id,
    patient_id: row.patient_id,
    join_time: toISOStringSafe(row.join_time),
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
