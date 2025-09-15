import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import { IPageIHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformPatientRecord";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Search and paginate patient records with advanced filters
 * (healthcare_platform_patient_records).
 *
 * This operation retrieves a filtered, paginated list of patient records in the
 * healthcarePlatform system. Allows nurses to search across organization and
 * department boundaries using advanced criteria, with strict compliance to
 * regulatory, clinical, and privacy/business logic. Excludes soft-deleted
 * records unless explicitly requested. All filters align with patient record
 * properties and support deep search, partial matches, and date ranges. Returns
 * type-safe, paginated summary records with correct branding and date-time
 * formatting; never uses Date, 'as', or assertions. Handles all edge cases for
 * missing, out-of-range, or omitted filters according to DTO constraints.
 *
 * @param props - Function argument
 * @param props.nurse - The authenticated nurse executing the query (already
 *   validated)
 * @param props.body - Patient record filter criteria and pagination request
 *   structure
 * @returns A paginated response containing summary information for matching
 *   patient records, including pagination metadata. Fields comply with
 *   IPageIHealthcarePlatformPatientRecord.ISummary structure.
 * @throws {Error} If business rules are violated or any database error occurs
 */
export async function patchhealthcarePlatformNursePatientRecords(props: {
  nurse: NursePayload;
  body: IHealthcarePlatformPatientRecord.IRequest;
}): Promise<IPageIHealthcarePlatformPatientRecord.ISummary> {
  const { body } = props;

  // Pagination defaults and normalization
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const page_size =
    typeof body.page_size === "number" && body.page_size > 0
      ? body.page_size
      : 20;

  // Build dynamic where clause per filter, using only verified fields/logic
  const where = {
    ...(body.organization_id !== undefined &&
      body.organization_id !== null && {
        organization_id: body.organization_id,
      }),
    ...(body.department_id !== undefined &&
      body.department_id !== null && { department_id: body.department_id }),
    ...(body.patient_user_id !== undefined &&
      body.patient_user_id !== null && {
        patient_user_id: body.patient_user_id,
      }),
    ...(body.full_name !== undefined &&
      body.full_name !== null && {
        full_name: { contains: body.full_name },
      }),
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
    ...(!body.include_deleted || body.include_deleted === false
      ? { deleted_at: null }
      : {}),
    // created_at, updated_at handled below
  };

  // Date range construction
  if (
    (body.created_at_start !== undefined && body.created_at_start !== null) ||
    (body.created_at_end !== undefined && body.created_at_end !== null)
  ) {
    where["created_at"] = {
      ...(body.created_at_start !== undefined &&
        body.created_at_start !== null && { gte: body.created_at_start }),
      ...(body.created_at_end !== undefined &&
        body.created_at_end !== null && { lte: body.created_at_end }),
    };
  }
  if (
    (body.updated_at_start !== undefined && body.updated_at_start !== null) ||
    (body.updated_at_end !== undefined && body.updated_at_end !== null)
  ) {
    where["updated_at"] = {
      ...(body.updated_at_start !== undefined &&
        body.updated_at_start !== null && { gte: body.updated_at_start }),
      ...(body.updated_at_end !== undefined &&
        body.updated_at_end !== null && { lte: body.updated_at_end }),
    };
  }

  // Sorting safety: only allow sort_order asc/desc on created_at
  const orderBy =
    body.sort_order === "asc" || body.sort_order === "desc"
      ? { created_at: body.sort_order }
      : { created_at: "desc" };

  // Perform query and count in parallel
  const [records, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_patient_records.findMany({
      where,
      skip: (page - 1) * page_size,
      take: page_size,
      orderBy,
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

  // Map to ISummary output; handle all types/branding per DTO and date transform conventions
  const data = records.map((record) => {
    const result: IHealthcarePlatformPatientRecord.ISummary = {
      id: record.id,
      full_name: record.full_name,
      dob: toISOStringSafe(record.dob),
      gender:
        record.gender === null || record.gender === undefined
          ? undefined
          : record.gender,
      status: record.status,
      organization_id: record.organization_id,
      department_id:
        record.department_id === null || record.department_id === undefined
          ? undefined
          : record.department_id,
      patient_user_id: record.patient_user_id,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    };
    return result;
  });

  // Pagination info brands (force native number ops for IPagination)
  const pagesNum = Math.ceil(total / page_size);
  return {
    pagination: {
      current: Number(page),
      limit: Number(page_size),
      records: Number(total),
      pages: Number(pagesNum),
    },
    data,
  };
}
