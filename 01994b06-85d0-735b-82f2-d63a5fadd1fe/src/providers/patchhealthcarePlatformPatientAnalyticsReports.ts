import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAnalyticsReport";
import { IPageIHealthcarePlatformAnalyticsReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformAnalyticsReport";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Search and retrieve paginated analytics report records
 * (IHealthcarePlatformAnalyticsReport) with filters and sorting.
 *
 * This operation provides a paginated, filtered search of analytics reports
 * available to the user (patient) across the platform or their organization. It
 * references the healthcare_platform_analytics_reports table and supports
 * searching, filtering, and sorting by attributes such as report name, owner,
 * department, or activity status. Results are paginated and data exposure is
 * scoped to the authenticated patient's accessible reports (created_by_user_id
 * = patient.id). Date/datetime values are always formatted as ISO 8601
 * strings.
 *
 * Authorization is enforced based on the patient's JWT and their identity. Only
 * analytics reports for the same patient are returned. Results are suitable for
 * reporting UI and pagination.
 *
 * @param props - Request properties
 * @param props.patient - PatientPayload for authenticated patient user
 * @param props.body - Search, filter, pagination, and sort configuration
 * @returns Paginated list of analytics reports matching user filters and query
 *   criteria
 * @throws {Error} If patient record is missing or soft-deleted
 */
export async function patchhealthcarePlatformPatientAnalyticsReports(props: {
  patient: PatientPayload;
  body: IHealthcarePlatformAnalyticsReport.IRequest;
}): Promise<IPageIHealthcarePlatformAnalyticsReport> {
  const { patient, body } = props;

  // Step 1: Check that patient is not soft-deleted
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patients.findFirst({
      where: { id: patient.id, deleted_at: null },
      select: { id: true },
    });
  if (!patientRecord) {
    throw new Error("Patient record not found or deleted");
  }

  // Step 2: Build where clause, enforcing patient-scope (created_by_user_id = patient.id)
  const where = {
    deleted_at: null,
    created_by_user_id: patient.id,
    ...(body.name !== undefined &&
      body.name !== null && { name: { contains: body.name } }),
    ...(body.organization_id !== undefined &&
      body.organization_id !== null && {
        organization_id: body.organization_id,
      }),
    ...(body.department_id !== undefined &&
      body.department_id !== null && { department_id: body.department_id }),
    ...(body.is_active !== undefined &&
      body.is_active !== null && { is_active: body.is_active }),
  };

  // Pagination
  const pageRaw = body.page ?? 1;
  const limitRaw = body.limit ?? 20;
  const page = Number(pageRaw);
  const limit = Number(limitRaw);
  const skip = (page - 1) * limit;

  // Sorting
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.sort) {
    const allowedSortFields = ["created_at", "name", "updated_at"];
    if (allowedSortFields.includes(body.sort)) {
      const sortOrder = body.order === "asc" ? "asc" : "desc";
      orderBy = { [body.sort]: sortOrder };
    }
  }

  // Query DB (data and count)
  const [rows, count] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_analytics_reports.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_analytics_reports.count({ where }),
  ]);

  // Map to API DTO
  const data = rows.map((row) => {
    return {
      id: row.id,
      created_by_user_id: row.created_by_user_id,
      organization_id: row.organization_id,
      department_id: row.department_id ?? undefined,
      name: row.name,
      description: row.description ?? undefined,
      template_config_json: row.template_config_json,
      is_active: row.is_active,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    };
  });

  // Pagination object construction
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: count,
      pages: Math.ceil(count / limit),
    },
    data,
  };
}
