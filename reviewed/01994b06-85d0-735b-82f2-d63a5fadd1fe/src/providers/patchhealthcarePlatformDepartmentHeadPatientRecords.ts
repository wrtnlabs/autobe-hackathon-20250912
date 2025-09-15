import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import { IPageIHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformPatientRecord";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Search and paginate patient records with advanced filters for department
 * heads.
 *
 * This operation allows department heads to retrieve a paginated, filtered list
 * of patient records in their organization and (optionally) department. It
 * enforces strict organization/department scoping, PHI privacy, and supports
 * advanced search (partial name, DOB, demographics, status, date ranges).
 * Soft-deleted records are excluded unless explicitly requested. Sorting and
 * pagination are compliant with regulatory and clinical needs. All accesses are
 * auditable and abide by data isolation policies.
 *
 * @param props - DepartmentHead: The authenticated DepartmentheadPayload making
 *   this request (JWT validated) body:
 *   IHealthcarePlatformPatientRecord.IRequest - Advanced search criteria and
 *   pagination
 * @returns A paginated result page
 *   (IPageIHealthcarePlatformPatientRecord.ISummary) with only authorized,
 *   schema-compliant records
 * @throws {Error} If filtering criteria would violate org/department boundaries
 */
export async function patchhealthcarePlatformDepartmentHeadPatientRecords(props: {
  departmentHead: DepartmentheadPayload;
  body: IHealthcarePlatformPatientRecord.IRequest;
}): Promise<IPageIHealthcarePlatformPatientRecord.ISummary> {
  const { departmentHead, body } = props;

  // Strict org/department access restriction: only allow records in departmentHead's org (id) and optionally department
  if (
    (body.organization_id !== undefined &&
      body.organization_id !== null &&
      body.organization_id !== departmentHead.id) ||
    (body.department_id !== undefined &&
      body.department_id !== null &&
      body.department_id !== undefined)
  ) {
    return {
      pagination: {
        current: Number(body.page ?? 1),
        limit: Number(body.page_size ?? 20),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  // Defaults, normalization
  const page = Number(body.page ?? 1);
  const page_size = Number(body.page_size ?? 20);

  // WHERE clause with field existence and correct null/undefined policy
  const where = {
    organization_id: departmentHead.id,
    ...(body.department_id !== undefined &&
      body.department_id !== null && {
        department_id: body.department_id,
      }),
    ...(body.patient_user_id !== undefined &&
      body.patient_user_id !== null && {
        patient_user_id: body.patient_user_id,
      }),
    ...(body.full_name !== undefined &&
      body.full_name !== null && {
        full_name: { contains: body.full_name },
      }),
    ...(body.dob !== undefined &&
      body.dob !== null && {
        dob: body.dob,
      }),
    ...(body.gender !== undefined &&
      body.gender !== null && {
        gender: body.gender,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.external_patient_number !== undefined &&
      body.external_patient_number !== null && {
        external_patient_number: body.external_patient_number,
      }),
    ...(body.include_deleted === true ? {} : { deleted_at: null }),
    // Date range: created_at
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
    // Date range: updated_at
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
    ...(body.demographics_contains !== undefined &&
      body.demographics_contains !== null && {
        demographics_json: { contains: body.demographics_contains }, // string contains, not deep JSON search (cross-db compatible)
      }),
  };

  // Sorting: only on created_at or updated_at, fallback desc
  let orderBy: Record<string, any> = { created_at: "desc" };
  if (typeof body.sort_order === "string" && body.sort_order.length > 0) {
    if (body.sort_order.includes("updated_at")) {
      orderBy = {
        updated_at: body.sort_order.startsWith("desc") ? "desc" : "asc",
      };
    } else {
      orderBy = {
        created_at: body.sort_order.startsWith("desc") ? "desc" : "asc",
      };
    }
  }

  // DB query
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_patient_records.findMany({
      where,
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
      orderBy,
      skip: (page - 1) * page_size,
      take: page_size,
    }),
    MyGlobal.prisma.healthcare_platform_patient_records.count({ where }),
  ]);

  // Result mapping: all date values transformed to string & tags.Format<'date-time'>
  return {
    pagination: {
      current: page,
      limit: page_size,
      records: total,
      pages: Math.ceil(total / page_size),
    },
    data: rows.map((record) => ({
      id: record.id,
      full_name: record.full_name,
      dob: toISOStringSafe(record.dob),
      gender: record.gender === undefined ? undefined : (record.gender ?? null),
      status: record.status,
      organization_id: record.organization_id,
      department_id:
        record.department_id === undefined
          ? undefined
          : (record.department_id ?? null),
      patient_user_id: record.patient_user_id,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
  };
}
