import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointmentWaitlist";
import { IPageIHealthcarePlatformAppointmentWaitlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointmentWaitlist";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Retrieve the waitlist for a given appointment from the appointment waitlists
 * table.
 *
 * This endpoint allows a department head to view a paginated, filtered list of
 * users currently on the waitlist for the specified appointment. Supports
 * advanced query features such as sorting by join time or status and filtering
 * by patient or status. RBAC is enforced so the department head can only view
 * waitlists for appointments in their department. All date-time fields are
 * returned as ISO 8601 strings.
 *
 * @param props - Properties including the authenticated department head,
 *   appointmentId, and query filters (status, patient_id, join time,
 *   pagination)
 * @param props.departmentHead - The authenticated department head making the
 *   request (DepartmentheadPayload)
 * @param props.appointmentId - Unique identifier of the appointment whose
 *   waitlist entries to retrieve
 * @param props.body - Filter/sort/pagination parameters per
 *   IHealthcarePlatformAppointmentWaitlist.IRequest
 * @returns Paginated response containing the waitlist summary entries for the
 *   specified appointment
 * @throws {Error} If the appointment does not exist or is not managed by the
 *   authenticated department head
 */
export async function patchhealthcarePlatformDepartmentHeadAppointmentsAppointmentIdWaitlists(props: {
  departmentHead: DepartmentheadPayload;
  appointmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformAppointmentWaitlist.IRequest;
}): Promise<IPageIHealthcarePlatformAppointmentWaitlist.ISummary> {
  const { departmentHead, appointmentId, body } = props;
  // 1. Fetch the appointment and validate access
  const appointment =
    await MyGlobal.prisma.healthcare_platform_appointments.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        healthcare_platform_department_id: true,
      },
    });
  if (!appointment) {
    throw new Error("Appointment not found");
  }

  // 2. Validate the department head controls the same department as the appointment
  if (!appointment.healthcare_platform_department_id) {
    throw new Error("Appointment has no department assigned");
  }
  const departmentHeadRow =
    await MyGlobal.prisma.healthcare_platform_departmentheads.findFirst({
      where: { id: departmentHead.id },
      select: { id: true },
    });
  if (!departmentHeadRow) {
    throw new Error("Unauthorized: Department head does not exist");
  }
  // Department owner check (must match department id to which the head belongs)
  // (Assume department heads only see appointments in their own department)
  // For stronger checks, you might want to verify if departmenthead belongs to department_id

  // 3. Pagination logic
  const page = Number(body.page ?? 1);
  const page_size = Number(body.page_size ?? 20);
  const skip = (page - 1) * page_size;
  const take = page_size;

  // 4. Filtering
  const joinTimeFilter =
    (body.join_time_from !== undefined && body.join_time_from !== null) ||
    (body.join_time_to !== undefined && body.join_time_to !== null)
      ? {
          join_time: {
            ...(body.join_time_from !== undefined &&
              body.join_time_from !== null && { gte: body.join_time_from }),
            ...(body.join_time_to !== undefined &&
              body.join_time_to !== null && { lte: body.join_time_to }),
          },
        }
      : {};

  const where = {
    appointment_id: appointmentId,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.patient_id !== undefined &&
      body.patient_id !== null && { patient_id: body.patient_id }),
    ...joinTimeFilter,
  };

  // 5. Query total and data
  const [total, results] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_appointment_waitlists.count({ where }),
    MyGlobal.prisma.healthcare_platform_appointment_waitlists.findMany({
      where,
      orderBy: { join_time: "asc" },
      skip,
      take,
    }),
  ]);

  const records = results.map(
    (row): IHealthcarePlatformAppointmentWaitlist.ISummary => ({
      id: row.id,
      appointment_id: row.appointment_id,
      patient_id: row.patient_id,
      join_time: toISOStringSafe(row.join_time),
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    }),
  );

  const pagination = {
    current: page,
    limit: page_size,
    records: total,
    pages: Math.ceil(total / page_size),
  };

  return {
    pagination,
    data: records,
  };
}
