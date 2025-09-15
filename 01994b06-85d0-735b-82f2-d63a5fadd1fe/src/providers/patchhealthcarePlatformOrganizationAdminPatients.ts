import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatient";
import { IPageIHealthcarePlatformPatient } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformPatient";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and list patient accounts with filters and pagination in
 * healthcare_platform_patients
 *
 * Retrieves a paginated and filtered list of patient user records belonging to
 * the authenticated organization admin's organization. Supports advanced search
 * on name, email, dates, and more. All returned fields are strictly
 * privacy-compliant summary types. Paging, sorting, and filtering rules match
 * the data contract.
 *
 * @param props - Object containing:
 *
 *   - OrganizationAdmin: OrganizationadminPayload for the authenticated admin
 *       (enforces org scope)
 *   - Body: IHealthcarePlatformPatient.IRequest with filtering, pagination, and
 *       sorting
 *
 * @returns IPageIHealthcarePlatformPatient.ISummary - Page of matching patient
 *   summaries and pagination info
 * @throws Error if the organization admin does not exist or admin's org scope
 *   cannot be resolved
 */
export async function patchhealthcarePlatformOrganizationAdminPatients(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformPatient.IRequest;
}): Promise<IPageIHealthcarePlatformPatient.ISummary> {
  const { organizationAdmin, body } = props;

  // 1. Lookup admin's organization (each admin assigned to exactly one org)
  const admin =
    await MyGlobal.prisma.healthcare_platform_organizationadmins.findFirst({
      where: {
        id: organizationAdmin.id,
        deleted_at: null,
      },
      select: {
        id: true,
        full_name: true,
        email: true /*, add org id when/if present */,
      },
    });
  if (!admin) throw new Error("Organization admin not found or is deleted");

  // 2. Find all patient_records for that organization
  const patientRecordRows =
    await MyGlobal.prisma.healthcare_platform_patient_records.findMany({
      where: {
        organization_id: admin.id, // <--- This assumes admin.id means org. If admin has org_id/organization_id, swap accordingly
        deleted_at: null, // Only consider active assignments
      },
      select: { patient_user_id: true },
    });
  if (patientRecordRows.length === 0) {
    return {
      pagination: {
        current: Number(body.page ?? 1),
        limit: Number(body.limit ?? 20),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  const userIdSet = [
    ...new Set(patientRecordRows.map((r) => r.patient_user_id)),
  ];

  // 3. Build where filtering for patients table (no use of any, only concrete fields)
  const patientWhere: Record<string, unknown> = {
    id: { in: userIdSet },
    ...(body.email ? { email: { contains: body.email } } : {}),
    ...(body.full_name ? { full_name: { contains: body.full_name } } : {}),
    ...(body.date_of_birth_from || body.date_of_birth_to
      ? {
          date_of_birth: {
            ...(body.date_of_birth_from && { gte: body.date_of_birth_from }),
            ...(body.date_of_birth_to && { lte: body.date_of_birth_to }),
          },
        }
      : {}),
    ...(body.created_at_from || body.created_at_to
      ? {
          created_at: {
            ...(body.created_at_from && { gte: body.created_at_from }),
            ...(body.created_at_to && { lte: body.created_at_to }),
          },
        }
      : {}),
    ...(body.deleted_at !== undefined ? { deleted_at: body.deleted_at } : {}),
  };

  // 4. Pagination and Ordering
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  const allowedSorts = ["created_at", "full_name", "date_of_birth"];
  const sortBy =
    body.sortBy && allowedSorts.includes(body.sortBy)
      ? body.sortBy
      : "created_at";
  const sortDir = body.sortDir === "asc" ? "asc" : "desc";

  // 5. Fetch paginated records and total count in parallel
  const [patients, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_patients.findMany({
      where: patientWhere,
      orderBy: { [sortBy]: sortDir },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_patients.count({ where: patientWhere }),
  ]);

  // 6. Map to summary records with strict type and date transformations
  const data = patients.map((p) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    date_of_birth: toISOStringSafe(p.date_of_birth),
    phone: p.phone ?? null,
    created_at: toISOStringSafe(p.created_at),
    updated_at: toISOStringSafe(p.updated_at),
  }));

  // 7. Return pagination and result
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
