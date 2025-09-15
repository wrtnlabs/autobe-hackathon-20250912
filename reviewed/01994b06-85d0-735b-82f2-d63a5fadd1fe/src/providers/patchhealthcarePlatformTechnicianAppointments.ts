import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import { IPageIHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointment";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Search, paginate, and filter scheduled appointments for a technician.
 *
 * Enables technicians to query appointments filtered by provider, patient,
 * status, department, time, etc, with RBAC-enforced access control and
 * compliance with data minimization and privacy constraints. Results include
 * summary information for calendar or list display, with robust pagination and
 * optional keyword/text searching. All appointments returned must be accessible
 * to the requesting technician's organization.
 *
 * @param props - The API props including authentication payload for technician
 *   and filter/search body
 * @param props.technician - The authenticated technician making the request
 * @param props.body - The search, filter, and pagination parameters to apply
 * @returns Paginated appointment summaries matching filter and access rules
 * @throws {Error} If technician not assigned to any org, or access violation
 *   detected
 */
export async function patchhealthcarePlatformTechnicianAppointments(props: {
  technician: TechnicianPayload;
  body: IHealthcarePlatformAppointment.IRequest;
}): Promise<IPageIHealthcarePlatformAppointment.ISummary> {
  const { technician, body } = props;

  // --- RBAC: Determine technician's assigned organization ---
  // Technician has only id, so must look up their org assignment
  const userOrgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: technician.id,
        deleted_at: null,
        assignment_status: "active",
      },
      select: { healthcare_platform_organization_id: true },
    });
  if (!userOrgAssignment) {
    throw new Error("Technician is not assigned to any organization.");
  }
  const orgId = userOrgAssignment.healthcare_platform_organization_id;

  // --- Pagination ---
  const pageRaw = body.page ?? 1;
  const pageSizeRaw = body.page_size ?? 20;
  const page = Number(pageRaw);
  const page_size = Number(pageSizeRaw);
  const skip = Math.max(0, (page - 1) * page_size);
  const take = page_size;

  // --- Sorting (default start_time desc) ---
  let sort_field:
    | "id"
    | "start_time"
    | "end_time"
    | "status_id"
    | "provider_id" = "start_time";
  let sort_order: "asc" | "desc" = "desc";
  if (body.sort) {
    const [field, order] = body.sort.split(":");
    if (
      ["id", "start_time", "end_time", "status_id", "provider_id"].includes(
        field,
      )
    ) {
      sort_field = field as typeof sort_field;
      sort_order = order === "asc" ? "asc" : "desc";
    }
  }

  // --- Where clause (inline, no intermediates) ---
  const where = {
    deleted_at: null,
    healthcare_platform_organization_id: orgId,
    ...(body.department_id !== undefined &&
      body.department_id !== null && {
        healthcare_platform_department_id: body.department_id,
      }),
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
    body.keyword.trim().length > 0
      ? {
          OR: [
            { title: { contains: body.keyword } },
            { description: { contains: body.keyword } },
          ],
        }
      : {}),
  };

  // --- Fetch page of appointments and total count ---
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_appointments.findMany({
      where,
      orderBy: { [sort_field]: sort_order },
      skip,
      take,
      // select all fields required for ISummary
    }),
    MyGlobal.prisma.healthcare_platform_appointments.count({ where }),
  ]);

  // --- Map results to ISummary DTO (enforce strict null vs undefined, and branded string types for date/datetime/uuid) ---
  const data = rows.map((row) => {
    const departmentId = row.healthcare_platform_department_id;
    // department_id is optional+nullable in summary
    const titleVal = row.title;
    const descVal = row.description;
    return {
      id: row.id,
      healthcare_platform_organization_id:
        row.healthcare_platform_organization_id,
      healthcare_platform_department_id:
        departmentId !== null && departmentId !== undefined
          ? departmentId
          : undefined,
      provider_id: row.provider_id,
      patient_id: row.patient_id,
      status_id: row.status_id,
      appointment_type: row.appointment_type,
      start_time: toISOStringSafe(row.start_time),
      end_time: toISOStringSafe(row.end_time),
      title: titleVal !== null && titleVal !== undefined ? titleVal : undefined,
      description:
        descVal !== null && descVal !== undefined ? descVal : undefined,
    };
  });

  // --- Pagination meta, cast with Number() to remove typia brand and match exact types ---
  const pagination = {
    current: Number(page),
    limit: Number(page_size),
    records: Number(total),
    pages: Math.ceil(total / page_size),
  };

  return { pagination, data };
}
