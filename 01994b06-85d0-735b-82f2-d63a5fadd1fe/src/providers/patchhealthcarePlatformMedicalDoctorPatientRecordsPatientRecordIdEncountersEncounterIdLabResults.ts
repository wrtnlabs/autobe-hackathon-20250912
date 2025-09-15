import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import { IPageIHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformLabResult";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Search and retrieve paginated laboratory results for a specific encounter and
 * patient record
 *
 * Retrieves a filtered, paginated list of laboratory results for a given
 * patient record and clinical encounter. Supports advanced filtering, searching
 * by test name, result flag, status, date/time ranges, and lab integration ID.
 * Only lab results for the specified (active) encounter and patient are
 * returned.
 *
 * @param props - Request parameters
 * @param props.medicalDoctor - The authenticated medical doctor making the
 *   request (authorization enforced via decorator)
 * @param props.patientRecordId - The unique identifier of the patient record
 * @param props.encounterId - The unique identifier of the EHR encounter
 * @param props.body - Search criteria and pagination options for lab results
 * @returns Paginated list of summarized lab result information matching filters
 * @throws {Error} When patient or encounter does not exist, is deleted, or
 *   belongs to a different parent
 */
export async function patchhealthcarePlatformMedicalDoctorPatientRecordsPatientRecordIdEncountersEncounterIdLabResults(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformLabResult.IRequest;
}): Promise<IPageIHealthcarePlatformLabResult.ISummary> {
  const { patientRecordId, encounterId, body } = props;

  // Validate patient record exists and is not archived (deleted)
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { id: patientRecordId, deleted_at: null },
    });
  if (!patientRecord) {
    throw new Error("Patient record not found or archived");
  }

  // Validate encounter exists, assigned to patientRecord, and not deleted
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: encounterId,
        patient_record_id: patientRecordId,
        deleted_at: null,
      },
    });
  if (!encounter) {
    throw new Error(
      "Encounter not found or does not belong to the patient record",
    );
  }

  // Build filters for lab result search (all null/undefined guard patterns handled)
  const where = {
    ehr_encounter_id: encounterId,
    deleted_at: null,
    ...(body.lab_integration_id !== undefined &&
      body.lab_integration_id !== null && {
        lab_integration_id: body.lab_integration_id,
      }),
    ...(body.test_name !== undefined &&
      body.test_name !== null && { test_name: { contains: body.test_name } }),
    ...(body.result_flag !== undefined &&
      body.result_flag !== null && { result_flag: body.result_flag }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.resulted_at_from !== undefined &&
    body.resulted_at_from !== null &&
    body.resulted_at_to !== undefined &&
    body.resulted_at_to !== null
      ? {
          resulted_at: { gte: body.resulted_at_from, lte: body.resulted_at_to },
        }
      : body.resulted_at_from !== undefined && body.resulted_at_from !== null
        ? { resulted_at: { gte: body.resulted_at_from } }
        : body.resulted_at_to !== undefined && body.resulted_at_to !== null
          ? { resulted_at: { lte: body.resulted_at_to } }
          : {}),
    ...(body.created_at_from !== undefined &&
    body.created_at_from !== null &&
    body.created_at_to !== undefined &&
    body.created_at_to !== null
      ? { created_at: { gte: body.created_at_from, lte: body.created_at_to } }
      : body.created_at_from !== undefined && body.created_at_from !== null
        ? { created_at: { gte: body.created_at_from } }
        : body.created_at_to !== undefined && body.created_at_to !== null
          ? { created_at: { lte: body.created_at_to } }
          : {}),
  };

  // Pagination variables (defaults per DTO)
  const page = body.page ?? 1;
  const pageSize = body.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  // Sorting
  let orderBy: Record<string, "asc" | "desc"> = { resulted_at: "desc" };
  if (body.sort && typeof body.sort === "string") {
    const [field, direction] = body.sort.trim().split(/\s+/);
    if (
      [
        "resulted_at",
        "test_name",
        "created_at",
        "status",
        "result_flag",
      ].includes(field) &&
      (direction === "asc" || direction === "desc")
    ) {
      orderBy = { [field]: direction };
    }
  }

  // Query results and total count in parallel
  const [results, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_lab_results.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: {
        id: true,
        ehr_encounter_id: true,
        test_name: true,
        result_flag: true,
        resulted_at: true,
        status: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_lab_results.count({ where }),
  ]);

  // Map output to ISummary DTO structure - resulted_at is string & tags.Format<'date-time'> by policy
  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: results.map((row) => ({
      id: row.id,
      ehr_encounter_id: row.ehr_encounter_id,
      test_name: row.test_name,
      result_flag: row.result_flag,
      resulted_at: row.resulted_at,
      status: row.status,
    })),
  };
}
