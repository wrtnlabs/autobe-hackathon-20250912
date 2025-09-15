import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import { IPageIHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointment";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Searches and paginates scheduled appointments for the authenticated patient.
 *
 * Searches and paginates the authenticated patient's scheduled appointments,
 * supporting advanced filtering, sorting, and keyword search. Results are
 * paginated and returned as summaries suitable for calendar or dashboard views.
 * Role-based access is enforced strictly so each patient can only see their own
 * appointments. Filtering and sorting parameters are provided via the request
 * body. Pagination metadata is provided in the response.
 *
 * Authorization: Only the authenticated patient can use this endpoint and will
 * only receive their own records. Other users, or access to other patients'
 * records, is forbidden.
 *
 * @param props - Request parameters
 * @param props.patient - The authenticated patient (role: patient)
 * @param props.body - Filtering, sorting, and pagination parameters
 * @returns Paginated list of appointment summaries for the patient
 * @throws {Error} If access is denied or an invalid parameter is provided
 */
export async function patchhealthcarePlatformPatientAppointments(props: {
  patient: PatientPayload;
  body: IHealthcarePlatformAppointment.IRequest;
}): Promise<IPageIHealthcarePlatformAppointment.ISummary> {
  const { patient, body } = props;

  // Pagination defaults
  const pageRaw =
    typeof body.page === "number" && body.page >= 1 ? body.page : 1;
  const pageSizeRaw =
    typeof body.page_size === "number" && body.page_size >= 1
      ? body.page_size
      : 20;
  const page = Number(pageRaw);
  const page_size = Number(pageSizeRaw);
  const skip = (page - 1) * page_size;
  const take = page_size;

  // Allowed sort fields and direction
  const allowedSortFields = [
    "start_time",
    "end_time",
    "status_id",
    "provider_id",
    "appointment_type",
    "created_at",
    "id",
  ];
  let sortField: string = "start_time";
  let sortOrder: "asc" | "desc" = "desc";
  if (body.sort) {
    const m = /^([a-zA-Z0-9_]+):(asc|desc)$/i.exec(body.sort);
    if (m && allowedSortFields.includes(m[1])) {
      sortField = m[1];
      sortOrder = m[2].toLowerCase() === "asc" ? "asc" : "desc";
    }
  }

  // Build where clause - strict patient access
  const where = {
    patient_id: patient.id,
    deleted_at: null,
    ...(body.status_id !== undefined &&
      body.status_id !== null && { status_id: body.status_id }),
    ...(body.provider_id !== undefined &&
      body.provider_id !== null && { provider_id: body.provider_id }),
    ...(body.organization_id !== undefined &&
      body.organization_id !== null && {
        healthcare_platform_organization_id: body.organization_id,
      }),
    ...(body.department_id !== undefined &&
      body.department_id !== null && {
        healthcare_platform_department_id: body.department_id,
      }),
    ...(body.room_id !== undefined &&
      body.room_id !== null && { room_id: body.room_id }),
    ...(body.equipment_id !== undefined &&
      body.equipment_id !== null && { equipment_id: body.equipment_id }),
    ...(body.appointment_type !== undefined &&
      body.appointment_type !== null && {
        appointment_type: body.appointment_type,
      }),
    ...((body.start_time_from !== undefined && body.start_time_from !== null) ||
    (body.start_time_to !== undefined && body.start_time_to !== null)
      ? {
          start_time: {
            ...(body.start_time_from !== undefined &&
              body.start_time_from !== null && { gte: body.start_time_from }),
            ...(body.start_time_to !== undefined &&
              body.start_time_to !== null && { lte: body.start_time_to }),
          },
        }
      : {}),
    ...((body.end_time_from !== undefined && body.end_time_from !== null) ||
    (body.end_time_to !== undefined && body.end_time_to !== null)
      ? {
          end_time: {
            ...(body.end_time_from !== undefined &&
              body.end_time_from !== null && { gte: body.end_time_from }),
            ...(body.end_time_to !== undefined &&
              body.end_time_to !== null && { lte: body.end_time_to }),
          },
        }
      : {}),
    ...(body.keyword !== undefined &&
    body.keyword !== null &&
    body.keyword.length > 0
      ? {
          OR: [
            { title: { contains: body.keyword } },
            { description: { contains: body.keyword } },
          ],
        }
      : {}),
  };

  // Query data and total in parallel
  const [appointments, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_appointments.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      select: {
        id: true,
        healthcare_platform_organization_id: true,
        healthcare_platform_department_id: true,
        provider_id: true,
        patient_id: true,
        status_id: true,
        start_time: true,
        end_time: true,
        appointment_type: true,
        title: true,
        description: true,
      },
      skip,
      take,
    }),
    MyGlobal.prisma.healthcare_platform_appointments.count({ where }),
  ]);

  // Build summary output
  return {
    pagination: {
      current: Number(page),
      limit: Number(page_size),
      records: total,
      pages: Math.ceil(page_size > 0 ? total / page_size : 0),
    },
    data: appointments.map((appt) => ({
      id: appt.id,
      healthcare_platform_organization_id:
        appt.healthcare_platform_organization_id,
      healthcare_platform_department_id:
        appt.healthcare_platform_department_id ?? undefined,
      provider_id: appt.provider_id,
      patient_id: appt.patient_id,
      status_id: appt.status_id,
      start_time: toISOStringSafe(appt.start_time),
      end_time: toISOStringSafe(appt.end_time),
      appointment_type: appt.appointment_type,
      title: appt.title ?? undefined,
      description: appt.description ?? undefined,
    })),
  };
}
