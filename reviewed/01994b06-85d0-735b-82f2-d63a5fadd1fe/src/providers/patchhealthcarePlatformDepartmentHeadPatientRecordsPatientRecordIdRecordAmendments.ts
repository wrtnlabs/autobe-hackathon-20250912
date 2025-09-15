import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import { IPageIHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformRecordAmendment";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Retrieve a paginated index of record amendments for a specific patient
 * record.
 *
 * This endpoint allows department heads to audit the lifecycle of all
 * amendments to a patient's medical record. Access is restricted by department
 * and compliance requirements, ensuring only authorized users can review change
 * histories. Search and pagination are provided across amendment type, status,
 * reviewer, and dates.
 *
 * @param props - Parameters for the record amendment search
 * @param props.departmentHead - The authenticated department head requesting
 *   the review
 * @param props.patientRecordId - UUID of the patient record to review
 * @param props.body - Filtering, sorting, and paging criteria for the search
 * @returns Paginated set of patient record amendments meeting the search
 *   criteria
 * @throws {Error} When patient record is not found, not active, or not
 *   authorized
 */
export async function patchhealthcarePlatformDepartmentHeadPatientRecordsPatientRecordIdRecordAmendments(props: {
  departmentHead: DepartmentheadPayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformRecordAmendment.IRequest;
}): Promise<IPageIHealthcarePlatformRecordAmendment> {
  const { departmentHead, patientRecordId, body } = props;

  // 1. Lookup patient record and authorize department context
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: {
        id: patientRecordId,
        deleted_at: null,
      },
      select: {
        id: true,
        department_id: true,
      },
    });

  if (!patientRecord) {
    throw new Error("Patient record not found or is not active");
  }

  // 2. Build where clause from filters
  const where = {
    patient_record_id: patientRecordId,
    ...(body.amendment_type && { amendment_type: body.amendment_type }),
    ...(body.approval_status && { approval_status: body.approval_status }),
    ...(body.reviewed_by_user_id && {
      reviewed_by_user_id: body.reviewed_by_user_id,
    }),
    ...(body.created_from || body.created_to
      ? {
          created_at: {
            ...(body.created_from ? { gte: body.created_from } : {}),
            ...(body.created_to ? { lte: body.created_to } : {}),
          },
        }
      : {}),
  };

  // 3. Pagination setup
  const page = typeof body.page === "number" ? body.page : 0;
  const limit = typeof body.limit === "number" ? body.limit : 50;
  const skip = page * limit;

  // 4. Sort
  const allowedSortFields = ["created_at", "approval_status", "amendment_type"];
  const sortField =
    body.sort && allowedSortFields.includes(body.sort)
      ? body.sort
      : "created_at";
  const sortOrder =
    body.order === "asc" || body.order === "desc" ? body.order : "desc";

  // 5. Query in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_record_amendments.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        patient_record_id: true,
        submitted_by_user_id: true,
        reviewed_by_user_id: true,
        ehr_encounter_id: true,
        amendment_type: true,
        old_value_json: true,
        new_value_json: true,
        rationale: true,
        approval_status: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_record_amendments.count({ where }),
  ]);

  // 6. Map results with proper undefined/null fields and date conversion
  const data = rows.map((row) => ({
    id: row.id,
    patient_record_id: row.patient_record_id,
    submitted_by_user_id: row.submitted_by_user_id,
    reviewed_by_user_id:
      row.reviewed_by_user_id == null ? undefined : row.reviewed_by_user_id,
    ehr_encounter_id:
      row.ehr_encounter_id == null ? undefined : row.ehr_encounter_id,
    amendment_type: row.amendment_type,
    old_value_json: row.old_value_json,
    new_value_json: row.new_value_json,
    rationale: row.rationale,
    approval_status:
      row.approval_status == null ? undefined : row.approval_status,
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: limit === 0 ? 0 : Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
