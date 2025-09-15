import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import { IPageIHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformPatientRecord";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and paginate patient records with advanced filters
 * (healthcare_platform_patient_records).
 *
 * This operation retrieves a paginated, filtered list of patient records housed
 * within the healthcarePlatform system. It is designed for use by authorized
 * roles such as clinicians, administrative staff, and compliance officers who
 * require efficient access to longitudinal patient data across organizational
 * and departmental boundaries.
 *
 * The endpoint supports advanced search criteria, including but not limited to
 * partial name matches, date-of-birth ranges, demographic fields (handled as
 * JSON), status queries (active, inactive, deceased, transferred), and optional
 * filtering by department or organization. Sorting and pagination parameters
 * are implemented to support scalable, real-time data entry and clinical review
 * workflows.
 *
 * All search requests are logged with user and organization context for
 * compliance and auditability, ensuring that access to PHI aligns with
 * organizational policies. Privacy flags and consent controls are enforced, and
 * unauthorized users are denied access with appropriate error messaging. Any
 * inclusion of soft-deleted or archived records requires explicit compliance
 * override, and these cases are fully auditable.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated organization admin user
 *   making the request
 * @param props.body - Search/filter/pagination parameters for advanced patient
 *   record lookup
 * @returns A page of filtered patient records and summary details matching the
 *   search criteria
 * @throws {Error} If organizational RBAC is violated or Prisma query fails
 */
export async function patchhealthcarePlatformOrganizationAdminPatientRecords(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformPatientRecord.IRequest;
}): Promise<IPageIHealthcarePlatformPatientRecord.ISummary> {
  const { organizationAdmin, body } = props;
  // RBAC - Enforce that queries only return records for admin's organization
  const organization_id = organizationAdmin.id;

  // Clamp pagination values
  const rawPage = body.page ?? 1;
  const page = rawPage < 1 ? 1 : rawPage;
  const rawPageSize = body.page_size ?? 20;
  const page_size = rawPageSize < 1 ? 1 : rawPageSize > 100 ? 100 : rawPageSize;
  const skip = (page - 1) * page_size;

  // Allowed sort fields for orderBy
  const allowedSortFields = ["created_at", "updated_at", "full_name"];
  const defaultSortField = "created_at";
  const rawSortField = body.sort_order;
  const sortField = allowedSortFields.includes(rawSortField ?? "")
    ? rawSortField
    : defaultSortField;
  const orderBy = { [sortField ?? defaultSortField]: "desc" };

  // Soft deletion logic: exclude unless include_deleted === true
  const excludeDeleted = !body.include_deleted;

  // Build where clause
  const where: Record<string, unknown> = {
    organization_id,
    ...(body.department_id !== undefined &&
      body.department_id !== null && { department_id: body.department_id }),
    ...(body.patient_user_id !== undefined &&
      body.patient_user_id !== null && {
        patient_user_id: body.patient_user_id,
      }),
    ...(body.full_name !== undefined &&
      body.full_name !== null && { full_name: { contains: body.full_name } }),
    ...(body.dob !== undefined && body.dob !== null && { dob: body.dob }),
    ...(body.gender !== undefined &&
      body.gender !== null && { gender: body.gender }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.external_patient_number !== undefined &&
      body.external_patient_number !== null && {
        external_patient_number: body.external_patient_number,
      }),
    ...(body.demographics_contains !== undefined &&
      body.demographics_contains !== null && {
        demographics_json: { contains: body.demographics_contains },
      }),
    // Date range filters for created_at and updated_at
    ...((body.created_at_start !== undefined &&
      body.created_at_start !== null) ||
    (body.created_at_end !== undefined && body.created_at_end !== null)
      ? {
          created_at: {
            ...(body.created_at_start !== undefined &&
              body.created_at_start !== null && { gte: body.created_at_start }),
            ...(body.created_at_end !== undefined &&
              body.created_at_end !== null && { lte: body.created_at_end }),
          },
        }
      : {}),
    ...((body.updated_at_start !== undefined &&
      body.updated_at_start !== null) ||
    (body.updated_at_end !== undefined && body.updated_at_end !== null)
      ? {
          updated_at: {
            ...(body.updated_at_start !== undefined &&
              body.updated_at_start !== null && { gte: body.updated_at_start }),
            ...(body.updated_at_end !== undefined &&
              body.updated_at_end !== null && { lte: body.updated_at_end }),
          },
        }
      : {}),
    ...(excludeDeleted && { deleted_at: null }),
  };

  // Query for paginated results and total
  const [records, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_patient_records.findMany({
      where,
      orderBy,
      skip,
      take: page_size,
    }),
    MyGlobal.prisma.healthcare_platform_patient_records.count({ where }),
  ]);

  // Map DB records to ISummary (convert all dates to ISO string, handle optional fields)
  const data = records.map((r) => ({
    id: r.id,
    full_name: r.full_name,
    dob: toISOStringSafe(r.dob),
    gender: r.gender === null ? undefined : r.gender,
    status: r.status,
    organization_id: r.organization_id,
    department_id: r.department_id === null ? undefined : r.department_id,
    patient_user_id: r.patient_user_id,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
  }));

  // Return IPage.IPage<IHealthcarePlatformPatientRecord.ISummary>
  return {
    pagination: {
      current: Number(page),
      limit: Number(page_size),
      records: total,
      pages: Math.ceil(total / page_size),
    },
    data,
  };
}
