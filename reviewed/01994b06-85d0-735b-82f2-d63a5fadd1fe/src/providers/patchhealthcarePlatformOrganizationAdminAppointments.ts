import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAppointment";
import { IPageIHealthcarePlatformAppointment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAppointment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and paginate appointments for organization's admin, with full RBAC
 * filtering and advanced query options.
 *
 * This endpoint allows an organization administrator to search, filter, and
 * paginate appointment records for their organization. Filters include
 * provider, patient, status, date ranges, department, resource, and more. Only
 * appointments for the admin's own organization are accessible; access outside
 * organizational boundaries is forbidden. RBAC and privacy requirements are
 * enforced. Sorting and pagination are supported, with defaults. Results return
 * paginated appointment summaries mapped to the DTO contract.
 *
 * @param props - Provider props
 * @param props.organizationAdmin - Authenticated admin payload (id)
 * @param props.body - IRequest filter, sort, and pagination parameters
 * @returns Paginated appointment summaries as
 *   IPageIHealthcarePlatformAppointment.ISummary
 * @throws {Error} If invalid status_id is provided, or unauthorized search
 *   attempted.
 */
export async function patchhealthcarePlatformOrganizationAdminAppointments(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformAppointment.IRequest;
}): Promise<IPageIHealthcarePlatformAppointment.ISummary> {
  const { organizationAdmin, body } = props;
  const orgAdminId = organizationAdmin.id;
  // First: lookup the admin's organization from org assignment (enforce org boundary)
  const orgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: orgAdminId,
        deleted_at: null,
        assignment_status: "active",
      },
      select: { healthcare_platform_organization_id: true },
    });
  if (!orgAssignment) {
    throw new Error("Cannot locate organization assignment for this admin");
  }
  const organizationId =
    orgAssignment.healthcare_platform_organization_id as string &
      tags.Format<"uuid">;
  // Allowed sort fields (all summary, safe)
  const ALLOWED_SORT_FIELDS = [
    "start_time",
    "end_time",
    "appointment_type",
    "status_id",
    "provider_id",
    "patient_id",
    "created_at",
  ];
  // sort value (e.g. start_time:desc)
  let sortField: string = "start_time";
  let sortOrder: "asc" | "desc" = "desc";
  if (body.sort && typeof body.sort === "string") {
    const [field, order] = body.sort.split(":");
    if (field && ALLOWED_SORT_FIELDS.includes(field)) {
      sortField = field;
      if (order && (order === "asc" || order === "desc")) {
        sortOrder = order;
      }
    }
  }
  // Pagination params
  const pag = Number(body.page ?? 1);
  const lim = Number(body.page_size ?? 20);
  const skip = (pag - 1) * lim;
  // Build where from filters
  const where: Record<string, any> = {
    healthcare_platform_organization_id: organizationId,
    deleted_at: null,
    ...(body.provider_id != null && { provider_id: body.provider_id }),
    ...(body.patient_id != null && { patient_id: body.patient_id }),
    ...(body.status_id != null && { status_id: body.status_id }),
    ...(body.department_id != null && {
      healthcare_platform_department_id: body.department_id,
    }),
    ...(body.room_id != null && { room_id: body.room_id }),
    ...(body.equipment_id != null && { equipment_id: body.equipment_id }),
    ...(body.appointment_type != null && {
      appointment_type: body.appointment_type,
    }),
    ...(body.start_time_from || body.start_time_to
      ? {
          start_time: {
            ...(body.start_time_from && { gte: body.start_time_from }),
            ...(body.start_time_to && { lte: body.start_time_to }),
          },
        }
      : {}),
    ...(body.end_time_from || body.end_time_to
      ? {
          end_time: {
            ...(body.end_time_from && { gte: body.end_time_from }),
            ...(body.end_time_to && { lte: body.end_time_to }),
          },
        }
      : {}),
    ...(body.keyword != null &&
      body.keyword.length > 0 && {
        OR: [
          { title: { contains: body.keyword } },
          { description: { contains: body.keyword } },
        ],
      }),
  };
  // If status_id given, validate it exists (and belongs to org by appointment linkage)
  if (body.status_id) {
    const statExists =
      await MyGlobal.prisma.healthcare_platform_appointment_statuses.findFirst({
        where: { id: body.status_id },
        select: { id: true },
      });
    if (!statExists) throw new Error("status_id is not a valid status");
  }
  // Count & query paginated appointments in parallel
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_appointments.count({ where }),
    MyGlobal.prisma.healthcare_platform_appointments.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: lim,
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
  // Map to ISummary
  const data = rows.map((row) => ({
    id: row.id,
    healthcare_platform_organization_id:
      row.healthcare_platform_organization_id,
    healthcare_platform_department_id:
      row.healthcare_platform_department_id ?? undefined,
    provider_id: row.provider_id,
    patient_id: row.patient_id,
    status_id: row.status_id,
    start_time: toISOStringSafe(row.start_time),
    end_time: toISOStringSafe(row.end_time),
    appointment_type: row.appointment_type,
    title: row.title ?? undefined,
    description: row.description ?? undefined,
  }));
  // Return paginated summary
  return {
    pagination: {
      current: pag,
      limit: lim,
      records: total,
      pages: Math.ceil(total / lim),
    },
    data,
  };
}
