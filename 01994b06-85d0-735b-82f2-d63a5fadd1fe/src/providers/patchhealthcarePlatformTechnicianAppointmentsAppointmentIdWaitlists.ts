import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { IPageIHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentWaitlist";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Retrieve the waitlist for a given appointment from the appointment waitlists
 * table.
 *
 * This operation enables a technician user (assigned to the appointment as
 * provider) to access the list of patients currently on the waitlist for a
 * specific appointment. It supports advanced filtering (by status, patient,
 * join time range) and pagination.
 *
 * Access is restricted to only those technicians who are assigned as provider
 * for the queried appointment. If the technician is not the assigned provider,
 * the operation will throw a forbidden error.
 *
 * All waitlist entries returned conform to organizational RBAC policy and
 * include mandatory identifiers and timestamps. Dates are returned as ISO 8601
 * strings.
 *
 * @param props - Call context
 * @param props.technician - Authenticated technician (must be provider for
 *   appointment)
 * @param props.appointmentId - The UUID of the appointment to query
 * @param props.body - Query and pagination parameters for advanced filtering
 * @returns Paginated list of waitlist summary entries for the appointment
 * @throws {Error} If technician is not assigned provider for appointment, or if
 *   appointment doesn't exist
 */
export async function patchhealthcarePlatformTechnicianAppointmentsAppointmentIdWaitlists(props: {
  technician: TechnicianPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.IRequest;
}): Promise<IPageIHealthcarePlatformAppointmentWaitlist.ISummary> {
  const { technician, appointmentId, body } = props;

  // Step 1: RBAC - confirm technician is assigned to this appointment
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findFirst({
      where: { id: appointmentId, provider_id: technician.id },
      select: { id: true },
    });
  if (!appointment) {
    throw new Error(
      "Forbidden: Technician not assigned as provider for this appointment",
    );
  }

  // Step 2: Build WHERE clause based on filters
  const where = {
    appointment_id: appointmentId,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.patient_id !== undefined &&
      body.patient_id !== null && { patient_id: body.patient_id }),
    ...((body.join_time_from !== undefined && body.join_time_from !== null) ||
    (body.join_time_to !== undefined && body.join_time_to !== null)
      ? {
          join_time: {
            ...(body.join_time_from !== undefined &&
              body.join_time_from !== null && { gte: body.join_time_from }),
            ...(body.join_time_to !== undefined &&
              body.join_time_to !== null && { lte: body.join_time_to }),
          },
        }
      : {}),
  };

  // Step 3: Pagination handling
  const page = body.page ?? 1;
  const pageSize = body.page_size ?? 20;
  const skip = (Number(page) - 1) * Number(pageSize);
  const take = Number(pageSize);

  // Step 4: Fetch rows and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_appointment_waitlists.findMany({
      where,
      orderBy: [{ join_time: "asc" }, { created_at: "asc" }],
      skip,
      take,
    }),
    MyGlobal.prisma.healthcare_platform_appointment_waitlists.count({ where }),
  ]);

  // Step 5: Transform results to ISummary
  const data = rows.map((row) => ({
    id: row.id,
    appointment_id: row.appointment_id,
    patient_id: row.patient_id,
    join_time: toISOStringSafe(row.join_time),
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // Step 6: Calculate correct pagination, ensure it matches IPage typing
  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / Number(pageSize)),
    },
    data,
  };
}
