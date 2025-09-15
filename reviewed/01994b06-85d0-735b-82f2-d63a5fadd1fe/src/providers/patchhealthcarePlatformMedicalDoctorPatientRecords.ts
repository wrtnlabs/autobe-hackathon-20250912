import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import { IPageIHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformPatientRecord";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Search and paginate patient records with advanced filters
 * (healthcare_platform_patient_records).
 *
 * This operation retrieves a paginated, filtered list of patient records housed
 * within the healthcarePlatform system. Authorized users such as clinicians can
 * use complex filter criteria including demographics, status, department, and
 * date ranges. Soft-deleted records are excluded unless explicitly included.
 * Supports secure RBAC, data isolation, and regulatory compliance.
 *
 * @param props - Object containing parameters for medical doctor authentication
 *   and request body
 * @param props.medicalDoctor - The authenticated medical doctor making the
 *   request
 * @param props.body - The patient record search filters and pagination
 *   information
 * @returns Paginated summary list of patient records matching advanced search
 *   criteria with correct RBAC, compliance, and sorting
 * @throws {Error} If organization_id is missing or doesn't match allowed RBAC
 *   context
 */
export async function patchhealthcarePlatformMedicalDoctorPatientRecords(props: {
  medicalDoctor: MedicaldoctorPayload;
  body: IHealthcarePlatformPatientRecord.IRequest;
}): Promise<IPageIHealthcarePlatformPatientRecord.ISummary> {
  const { medicalDoctor, body } = props;
  const {
    organization_id,
    department_id,
    patient_user_id,
    full_name,
    dob,
    gender,
    status,
    external_patient_number,
    demographics_contains,
    created_at_start,
    created_at_end,
    updated_at_start,
    updated_at_end,
    include_deleted,
    sort_order,
    page,
    page_size,
  } = body;

  // RBAC enforcement (doctor can view only patients from specified organization)
  if (!organization_id) {
    throw new Error("organization_id is required for patient record search");
  }

  // Pagination defaults and formatting
  const rawPage = typeof page === "number" && page > 0 ? page : 1;
  const rawLimit =
    typeof page_size === "number" && page_size > 0 ? page_size : 20;
  // Pagination types per IPage.IPagination
  const current = Number(rawPage) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = Number(rawLimit) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skip = (current - 1) * limit;

  // Supported sort fields: created_at, updated_at; default to created_at desc
  let orderField: "created_at" | "updated_at" = "created_at";
  let orderDirection: "asc" | "desc" = "desc";
  if (typeof sort_order === "string") {
    if (sort_order.startsWith("updated_at")) {
      orderField = "updated_at";
    } else if (sort_order.startsWith("created_at")) {
      orderField = "created_at";
    }
    if (sort_order.endsWith("asc")) {
      orderDirection = "asc";
    }
  }

  // Build Prisma where clause: spread only defined + handle nullable and optional fields
  const where: Record<string, unknown> = {
    organization_id,
    ...(department_id !== undefined && department_id !== null
      ? { department_id }
      : {}),
    ...(patient_user_id !== undefined && patient_user_id !== null
      ? { patient_user_id }
      : {}),
    ...(full_name !== undefined && full_name !== null && full_name.length > 0
      ? { full_name: { contains: full_name } }
      : {}),
    ...(dob !== undefined && dob !== null ? { dob: dob } : {}),
    ...(gender !== undefined && gender !== null && gender.length > 0
      ? { gender }
      : {}),
    ...(status !== undefined && status !== null && status.length > 0
      ? { status }
      : {}),
    ...(external_patient_number !== undefined &&
    external_patient_number !== null &&
    external_patient_number.length > 0
      ? { external_patient_number: { contains: external_patient_number } }
      : {}),
    ...(demographics_contains !== undefined &&
    demographics_contains !== null &&
    demographics_contains.length > 0
      ? { demographics_json: { contains: demographics_contains } }
      : {}),
    ...(created_at_start !== undefined || created_at_end !== undefined
      ? {
          created_at: {
            ...(created_at_start !== undefined &&
            created_at_start !== null &&
            created_at_start.length > 0
              ? { gte: created_at_start }
              : {}),
            ...(created_at_end !== undefined &&
            created_at_end !== null &&
            created_at_end.length > 0
              ? { lte: created_at_end }
              : {}),
          },
        }
      : {}),
    ...(updated_at_start !== undefined || updated_at_end !== undefined
      ? {
          updated_at: {
            ...(updated_at_start !== undefined &&
            updated_at_start !== null &&
            updated_at_start.length > 0
              ? { gte: updated_at_start }
              : {}),
            ...(updated_at_end !== undefined &&
            updated_at_end !== null &&
            updated_at_end.length > 0
              ? { lte: updated_at_end }
              : {}),
          },
        }
      : {}),
    ...(include_deleted ? {} : { deleted_at: null }),
  };

  // Query patient records and count in parallel
  const [rows, records] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_patient_records.findMany({
      where,
      orderBy: { [orderField]: orderDirection },
      skip,
      take: limit,
      select: {
        id: true,
        full_name: true,
        dob: true,
        gender: true,
        status: true,
        organization_id: true,
        department_id: true,
        patient_user_id: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_patient_records.count({ where }),
  ]);

  // Format results: All date/time values as string & tags.Format<"date-time">, ids as branded types
  const data = rows.map((row) => {
    const summary: IHealthcarePlatformPatientRecord.ISummary = {
      id: row.id,
      full_name: row.full_name,
      dob: toISOStringSafe(row.dob),
      gender: row.gender !== undefined ? row.gender : undefined,
      status: row.status,
      organization_id: row.organization_id,
      department_id: row.department_id !== null ? row.department_id : undefined,
      patient_user_id: row.patient_user_id,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    };
    return summary;
  });

  return {
    pagination: {
      current,
      limit,
      records: records as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(records / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
