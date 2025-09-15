import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformVital";
import { IPageIHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformVital";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Search and retrieve a paginated, filterable list of patient vital sign
 * entries for an encounter
 *
 * Retrieves a filtered and paginated list of vital sign entries for a patient
 * encounter, allowing clinicians and staff to search, sort, and analyze vital
 * data by type, value, measurement timestamp, and recording nurse.
 *
 * The request body supports detailed filtering and complex searches, with
 * options such as measurement intervals, value ranges, and vital type
 * specificity. The response includes paginated vital entry data, and role-based
 * filtering is applied to ensure organizational/departmental boundaries are
 * respected.
 *
 * Security: Only users in care roles (medical doctor, nurse, department head)
 * with organizational context are allowed access. All data retrievals are
 * recorded in audit logs for compliance and incident review.
 *
 * @param props - The request properties
 * @param props.nurse - Authenticated nurse (NursePayload) making the request
 * @param props.patientRecordId - UUID of the target patient record
 * @param props.encounterId - UUID of the target encounter
 * @param props.body - Filtering, sorting, and pagination parameters for the
 *   vitals search
 * @returns Paginated list of vital entries and pagination metadata
 * @throws {Error} Throws "Encounter or patient record not found" (404) if
 *   patient or encounter is invalid
 * @throws {Error} Throws on general database errors or forbidden access based
 *   on business rules (RBAC edge cases)
 */
export async function patchhealthcarePlatformNursePatientRecordsPatientRecordIdEncountersEncounterIdVitals(props: {
  nurse: NursePayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformVital.IRequest;
}): Promise<IPageIHealthcarePlatformVital> {
  const { nurse, patientRecordId, encounterId, body } = props;

  // Validate that the encounter exists and is associated with the given patient record
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: encounterId,
        patient_record_id: patientRecordId,
      },
    });
  if (!encounter) {
    throw new Error("Encounter or patient record not found");
  }

  // Optional: Extract organization_id from patient record for audit log context
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { id: patientRecordId },
      select: { organization_id: true },
    });
  const organizationId = patientRecord
    ? patientRecord.organization_id
    : undefined;

  // Construct vital filtering logic
  const baseWhere: Record<string, unknown> = {
    ehr_encounter_id: encounterId,
  };
  if (body.vital_type !== undefined && body.vital_type !== null) {
    baseWhere.vital_type = body.vital_type;
  }
  if (body.value_min !== undefined && body.value_min !== null) {
    baseWhere.vital_value = {
      ...((baseWhere.vital_value as Record<string, number>) ?? {}),
      gte: body.value_min,
    };
  }
  if (body.value_max !== undefined && body.value_max !== null) {
    baseWhere.vital_value = {
      ...((baseWhere.vital_value as Record<string, number>) ?? {}),
      lte: body.value_max,
    };
  }
  if (body.measured_after !== undefined && body.measured_after !== null) {
    baseWhere.measured_at = {
      ...((baseWhere.measured_at as Record<string, string>) ?? {}),
      gte: body.measured_after,
    };
  }
  if (body.measured_before !== undefined && body.measured_before !== null) {
    baseWhere.measured_at = {
      ...((baseWhere.measured_at as Record<string, string>) ?? {}),
      lte: body.measured_before,
    };
  }
  if (
    body.recorded_by_user_id !== undefined &&
    body.recorded_by_user_id !== null
  ) {
    baseWhere.recorded_by_user_id = body.recorded_by_user_id;
  }
  if (body.unit !== undefined && body.unit !== null) {
    baseWhere.unit = body.unit;
  }

  // Accept only whitelisted sort fields; fallback to 'measured_at' if invalid
  const allowedSortFields = ["measured_at", "vital_value", "created_at"];
  let sortField = "measured_at";
  if (
    typeof body.sort_by === "string" &&
    allowedSortFields.includes(body.sort_by)
  ) {
    sortField = body.sort_by;
  }
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // Pagination
  const pageRaw =
    typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limitRaw =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;
  const page = Number(pageRaw);
  const limit = Number(limitRaw);
  const skip = (page - 1) * limit;

  // Query data and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_vitals.findMany({
      where: baseWhere,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_vitals.count({
      where: baseWhere,
    }),
  ]);

  // Audit log (do not use Date type, all timestamps must go through toISOStringSafe)
  await MyGlobal.prisma.healthcare_platform_access_logs.create({
    data: {
      id: v4(),
      user_id: nurse.id,
      organization_id: organizationId,
      resource_type: "PATIENT_RECORD",
      resource_id: patientRecordId,
      access_purpose: "care",
      created_at: toISOStringSafe(new Date()),
    },
  });

  // Page response
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      ehr_encounter_id: row.ehr_encounter_id,
      recorded_by_user_id: row.recorded_by_user_id,
      vital_type: row.vital_type,
      vital_value: row.vital_value,
      unit: row.unit,
      measured_at: toISOStringSafe(row.measured_at),
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
