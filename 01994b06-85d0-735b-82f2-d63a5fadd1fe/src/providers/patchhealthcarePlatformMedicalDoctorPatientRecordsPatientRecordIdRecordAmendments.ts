import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import { IPageIHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformRecordAmendment";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Retrieve a paginated index of record amendments for a specific patient
 * record.
 *
 * This operation provides a filtered, paginated index of record amendments for
 * a given patient record. It applies role-based access control to ensure that
 * the requesting medical doctor has access rights to the patient record. All
 * returned records are mapped to the standard amendment DTO, with accurate
 * type-safe date conversion and strict pagination per API spec. Filtering and
 * sorting are supported on type, status, reviewer, and creation timestamps.
 *
 * @param props - Input containing the authenticated medical doctor,
 *   patientRecordId (UUID), and request filter body
 *
 *   - MedicalDoctor: Authenticated MedicaldoctorPayload, enforced by decorator
 *   - PatientRecordId: string & tags.Format<'uuid'>, unique patient record id
 *   - Body: IHealthcarePlatformRecordAmendment.IRequest, filtering, pagination,
 *       sort
 *
 * @returns A paginated list of record amendment entries matching the filter
 *   criteria
 * @throws {Error} When access is not permitted or the patient record is not
 *   found
 */
export async function patchhealthcarePlatformMedicalDoctorPatientRecordsPatientRecordIdRecordAmendments(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformRecordAmendment.IRequest;
}): Promise<IPageIHealthcarePlatformRecordAmendment> {
  const { medicalDoctor, patientRecordId, body } = props;

  // 1. Validate patient record existence (and soft-delete)
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: {
        id: patientRecordId,
        deleted_at: null,
      },
    });
  if (!patientRecord)
    throw new Error("Patient record not found or inaccessible.");

  // 2. Authorization: medicalDoctor must be assigned to patientRecord's organization
  const hasAccess =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: medicalDoctor.id,
        healthcare_platform_organization_id: patientRecord.organization_id,
      },
    });
  if (!hasAccess)
    throw new Error(
      "Not authorized to view amendments for this patient record.",
    );

  // 3. Build WHERE clause for filtering
  const whereClause: Record<string, unknown> = {
    patient_record_id: patientRecordId,
    deleted_at: null,
    ...(body.amendment_type !== undefined &&
      body.amendment_type !== null && {
        amendment_type: body.amendment_type,
      }),
    ...(body.approval_status !== undefined &&
      body.approval_status !== null && {
        approval_status: body.approval_status,
      }),
    ...(body.reviewed_by_user_id !== undefined &&
      body.reviewed_by_user_id !== null && {
        reviewed_by_user_id: body.reviewed_by_user_id,
      }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && { gte: body.created_from }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && { lte: body.created_to }),
          },
        }
      : {}),
  };

  // 4. Pagination and sorting (normalize number branding)
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortField = body.sort ?? "created_at";
  const sortOrder: "asc" | "desc" = body.order === "asc" ? "asc" : "desc";

  // 5. Database queries
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_record_amendments.findMany({
      where: whereClause,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_record_amendments.count({
      where: whereClause,
    }),
  ]);

  // 6. Map and normalize response for API DTO
  const data = rows.map((row) => {
    return {
      id: row.id,
      patient_record_id: row.patient_record_id,
      submitted_by_user_id: row.submitted_by_user_id,
      reviewed_by_user_id:
        row.reviewed_by_user_id === null ? undefined : row.reviewed_by_user_id,
      ehr_encounter_id:
        row.ehr_encounter_id === null ? undefined : row.ehr_encounter_id,
      amendment_type: row.amendment_type,
      old_value_json: row.old_value_json,
      new_value_json: row.new_value_json,
      rationale: row.rationale,
      approval_status:
        row.approval_status === null ? undefined : row.approval_status,
      created_at: toISOStringSafe(row.created_at),
    };
  });

  // 7. Return formatted paginated object (using Number() to strip brands)
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
