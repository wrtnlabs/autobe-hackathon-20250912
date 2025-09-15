import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import { IPageIHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointment";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Search and paginate appointments across providers, patients, and departments
 * (healthcare_platform_appointments).
 *
 * This handler retrieves appointment summaries where the authenticated medical
 * doctor is assigned as provider. Supports advanced filtering (by patient,
 * status, department, time ranges, resource IDs, and text search), robust
 * pagination, and safe sorting. Pagination, sorting, and filters are all
 * enforced within RBAC so that this doctor only sees appointments where
 * provider_id = their id. Date fields are always returned as ISO strings.
 * Optional fields use undefined if null. No native Date type or type coercions
 * are ever used. Implements pure functional, side-effect-free data access.
 *
 * @param props - Object containing parameters for the operation
 * @param props.medicalDoctor - The authenticated medical doctor (provides
 *   provider_id via id)
 * @param props.body - Filtering, sorting, and pagination parameters for
 *   appointments search
 * @returns Paginated appointment summaries matching the search/filter criteria
 * @throws {Error} If the authenticated user is not allowed to view
 *   appointments, or a DB error occurs
 */
export async function patchhealthcarePlatformMedicalDoctorAppointments(props: {
  medicalDoctor: MedicaldoctorPayload;
  body: IHealthcarePlatformAppointment.IRequest;
}): Promise<IPageIHealthcarePlatformAppointment.ISummary> {
  const { medicalDoctor, body } = props;

  // Pagination defaults
  const page = body.page ?? (1 as number);
  const page_size = body.page_size ?? (20 as number);
  const skip = (page - 1) * page_size;

  // Build allowed sort field/order (default: start_time desc)
  let orderBy = { start_time: "desc" as const };
  if (body.sort) {
    const [raw_field, raw_order] = body.sort.split(":");
    const allowed_fields = [
      "start_time",
      "end_time",
      "status_id",
      "provider_id",
      "patient_id",
    ];
    if (
      typeof raw_field === "string" &&
      allowed_fields.includes(raw_field) &&
      (raw_order === "asc" || raw_order === "desc")
    ) {
      orderBy = { [raw_field]: raw_order as "asc" | "desc" };
    }
  }

  // Build where filters, always restrict to this provider_id and not soft-deleted
  const where: Record<string, any> = {
    provider_id: medicalDoctor.id,
    deleted_at: null,
    ...(body.patient_id !== undefined &&
      body.patient_id !== null && { patient_id: body.patient_id }),
    ...(body.status_id !== undefined &&
      body.status_id !== null && { status_id: body.status_id }),
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
  };

  // Time filters (start_time, end_time)
  if (
    (body.start_time_from !== undefined && body.start_time_from !== null) ||
    (body.start_time_to !== undefined && body.start_time_to !== null)
  ) {
    where.start_time = {
      ...(body.start_time_from !== undefined &&
        body.start_time_from !== null && { gte: body.start_time_from }),
      ...(body.start_time_to !== undefined &&
        body.start_time_to !== null && { lte: body.start_time_to }),
    };
  }
  if (
    (body.end_time_from !== undefined && body.end_time_from !== null) ||
    (body.end_time_to !== undefined && body.end_time_to !== null)
  ) {
    where.end_time = {
      ...(body.end_time_from !== undefined &&
        body.end_time_from !== null && { gte: body.end_time_from }),
      ...(body.end_time_to !== undefined &&
        body.end_time_to !== null && { lte: body.end_time_to }),
    };
  }

  // Keyword search (only on String fields, never UUIDs)
  if (
    body.keyword !== undefined &&
    body.keyword !== null &&
    body.keyword.length > 0
  ) {
    where.OR = [
      { title: { contains: body.keyword } },
      { description: { contains: body.keyword } },
    ];
  }

  // Query appointments & total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_appointments.findMany({
      where,
      orderBy,
      skip,
      take: page_size,
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
    }),
    MyGlobal.prisma.healthcare_platform_appointments.count({ where }),
  ]);

  // Map result rows to ISummary, converting dates and handling optionals
  const data = rows.map((row) => {
    return {
      id: row.id,
      healthcare_platform_organization_id:
        row.healthcare_platform_organization_id,
      healthcare_platform_department_id:
        row.healthcare_platform_department_id !== null
          ? row.healthcare_platform_department_id
          : undefined,
      provider_id: row.provider_id,
      patient_id: row.patient_id,
      status_id: row.status_id,
      start_time: toISOStringSafe(row.start_time),
      end_time: toISOStringSafe(row.end_time),
      appointment_type: row.appointment_type,
      title: row.title !== null ? row.title : undefined,
      description: row.description !== null ? row.description : undefined,
    };
  });

  // Pagination structure
  return {
    pagination: {
      current: Number(page),
      limit: Number(page_size),
      records: total,
      pages: Math.ceil(total / Number(page_size)),
    },
    data,
  };
}
