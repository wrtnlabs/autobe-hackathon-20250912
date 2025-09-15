import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import { IPageIHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointment";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Search and paginate appointments across providers, patients, and departments
 * (healthcare_platform_appointments).
 *
 * This operation allows department heads to search for scheduled appointments
 * in their department using advanced filtering and pagination. RBAC
 * restrictions ensure department heads cannot view or search appointments
 * outside their own department. Supports filtering by provider, patient, time
 * windows, type, and more; sorting on specific fields; and robust pagination.
 * Privacy and access are strictly enforced.
 *
 * @param props - Properties for the appointment search operation
 * @param props.departmentHead - The authenticated department head user
 *   requesting the search
 * @param props.body - Search, filter, and pagination parameters for
 *   appointments
 * @returns Paginated appointment summaries matching query criteria, only within
 *   department head's assigned department
 * @throws {Error} If attempting to access appointments outside permitted
 *   department scope
 */
export async function patchhealthcarePlatformDepartmentHeadAppointments(props: {
  departmentHead: DepartmentheadPayload;
  body: IHealthcarePlatformAppointment.IRequest;
}): Promise<IPageIHealthcarePlatformAppointment.ISummary> {
  const { departmentHead, body } = props;

  // RBAC - restrict search to only department head's department
  if (
    body.department_id !== undefined &&
    body.department_id !== null &&
    body.department_id !== departmentHead.id
  ) {
    throw new Error(
      "Forbidden: You may only search appointments within your department scope.",
    );
  }

  // Pagination with defaults and maximum cap
  const page =
    body.page !== undefined && body.page !== null && body.page > 0
      ? body.page
      : 1;
  const pageSize =
    body.page_size !== undefined &&
    body.page_size !== null &&
    body.page_size > 0
      ? body.page_size
      : 20;
  const maxPageSize = 50;
  const take = pageSize > maxPageSize ? maxPageSize : pageSize;
  const skip = (page - 1) * take;

  // Allowed sorting fields
  const allowedSortFields = [
    "start_time",
    "end_time",
    "status_id",
    "provider_id",
  ];
  let orderBy: Record<string, "asc" | "desc"> = { start_time: "asc" };
  if (body.sort) {
    const [rawField, rawDirection] = body.sort.split(":");
    const field =
      rawField === undefined
        ? "start_time"
        : (rawField.trim() as keyof typeof orderBy);
    const direction = rawDirection === "desc" ? "desc" : "asc";
    if (allowedSortFields.includes(field)) {
      orderBy = { [field]: direction };
    }
  }

  // Build WHERE clause for Prisma
  const where = {
    deleted_at: null,
    healthcare_platform_department_id: departmentHead.id,
    ...(body.provider_id !== undefined &&
      body.provider_id !== null && {
        provider_id: body.provider_id,
      }),
    ...(body.patient_id !== undefined &&
      body.patient_id !== null && {
        patient_id: body.patient_id,
      }),
    ...(body.status_id !== undefined &&
      body.status_id !== null && {
        status_id: body.status_id,
      }),
    ...(body.appointment_type !== undefined &&
      body.appointment_type !== null && {
        appointment_type: body.appointment_type,
      }),
    ...(body.room_id !== undefined &&
      body.room_id !== null && {
        room_id: body.room_id,
      }),
    ...(body.equipment_id !== undefined &&
      body.equipment_id !== null && {
        equipment_id: body.equipment_id,
      }),
    ...((body.start_time_from !== undefined && body.start_time_from !== null) ||
    (body.start_time_to !== undefined && body.start_time_to !== null)
      ? {
          start_time: {
            ...(body.start_time_from !== undefined &&
              body.start_time_from !== null && {
                gte: body.start_time_from,
              }),
            ...(body.start_time_to !== undefined &&
              body.start_time_to !== null && {
                lte: body.start_time_to,
              }),
          },
        }
      : {}),
    ...((body.end_time_from !== undefined && body.end_time_from !== null) ||
    (body.end_time_to !== undefined && body.end_time_to !== null)
      ? {
          end_time: {
            ...(body.end_time_from !== undefined &&
              body.end_time_from !== null && {
                gte: body.end_time_from,
              }),
            ...(body.end_time_to !== undefined &&
              body.end_time_to !== null && {
                lte: body.end_time_to,
              }),
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

  // Query total and findMany concurrently
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_appointments.count({ where }),
    MyGlobal.prisma.healthcare_platform_appointments.findMany({
      where,
      orderBy,
      skip,
      take,
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
  ]);

  // Map to summary output, converting all Date-times
  const data = rows.map((row) => {
    return {
      id: row.id,
      healthcare_platform_organization_id:
        row.healthcare_platform_organization_id,
      healthcare_platform_department_id:
        row.healthcare_platform_department_id === null
          ? null
          : row.healthcare_platform_department_id,
      provider_id: row.provider_id,
      patient_id: row.patient_id,
      status_id: row.status_id,
      start_time: toISOStringSafe(row.start_time),
      end_time: toISOStringSafe(row.end_time),
      appointment_type: row.appointment_type,
      title: row.title === null ? null : row.title,
      description: row.description === null ? null : row.description,
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(take),
      records: Number(total),
      pages: Math.ceil(total / take),
    },
    data,
  };
}
