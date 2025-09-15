import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformVital";
import { IPageIHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformVital";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Search and retrieve a paginated, filterable list of patient vital sign
 * entries for an encounter.
 *
 * This endpoint returns a page of vital records for a given encounter, applying
 * complex search, filtering, and pagination logic as requested. Access is
 * strictly controlled to the assigned provider.
 *
 * Security: Only assigned medicalDoctor (provider_user_id) may retrieve
 * encounter vitals. All retrievals are logged for audit compliance.
 * Soft-deleted records are excluded everywhere.
 *
 * @param props - MedicalDoctor: The authenticated medical doctor performing the
 *   request patientRecordId: The patient record UUID that owns the encounter
 *   encounterId: The EHR encounter's UUID whose vitals are being retrieved
 *   body: Search/filter/page parameters for vital query
 * @returns Page of vital records matching search parameters
 * @throws {Error} When patient record does not exist (soft-deleted)
 * @throws {Error} When encounter does not exist/invalid, is soft-deleted, or
 *   does not match patient record
 * @throws {Error} When the encounter is completed/finalized/locked
 * @throws {Error} When the medicalDoctor is not the assigned provider for the
 *   encounter
 */
export async function patchhealthcarePlatformMedicalDoctorPatientRecordsPatientRecordIdEncountersEncounterIdVitals(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformVital.IRequest;
}): Promise<IPageIHealthcarePlatformVital> {
  const { medicalDoctor, patientRecordId, encounterId, body } = props;

  // 1. Patient record existence & soft-deletion check
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: {
        id: patientRecordId,
        deleted_at: null,
      },
    });
  if (!patientRecord) {
    throw new Error("Patient record not found");
  }

  // 2. Encounter existence, correct attachment, & soft-deletion check
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: encounterId,
        patient_record_id: patientRecordId,
        deleted_at: null,
      },
    });
  if (!encounter) {
    throw new Error("Encounter not found");
  }

  // 3. No viewing if finalized/completed/locked
  if (encounter.status === "completed" || encounter.status === "locked") {
    throw new Error("Cannot retrieve vitals for completed/locked encounter");
  }

  // 4. AuthZ: Only provider may view
  if (encounter.provider_user_id !== medicalDoctor.id) {
    throw new Error("Forbidden: You are not the provider for this encounter");
  }

  // 5. Search + paging
  const {
    vital_type,
    value_min,
    value_max,
    measured_after,
    measured_before,
    recorded_by_user_id,
    unit,
    sort_by,
    sort_order,
    page,
    limit,
  } = body;

  // Determine paging with defaults and safe numeric conversion
  const safePage = (page ?? 1) as number;
  const safeLimit = (limit ?? 20) as number;
  const skip = (safePage - 1) * safeLimit;

  // WHERE clause for vitals search
  // Properly type range filter objects to avoid TS7053
  const rangeFilters: { gte?: number; lte?: number } = {};
  if (value_min !== undefined) {
    rangeFilters.gte = value_min;
  }
  if (value_max !== undefined) {
    rangeFilters.lte = value_max;
  }

  const measuredRange: { gte?: string; lte?: string } = {};
  if (measured_after !== undefined) {
    measuredRange.gte = measured_after;
  }
  if (measured_before !== undefined) {
    measuredRange.lte = measured_before;
  }

  // Compose where filter
  const where = {
    ehr_encounter_id: encounterId,
    deleted_at: null,
    ...(vital_type !== undefined ? { vital_type } : {}),
    ...(recorded_by_user_id !== undefined ? { recorded_by_user_id } : {}),
    ...(unit !== undefined ? { unit } : {}),
    ...(Object.keys(rangeFilters).length > 0
      ? { vital_value: rangeFilters }
      : {}),
    ...(Object.keys(measuredRange).length > 0
      ? { measured_at: measuredRange }
      : {}),
  };

  // Ordering: default measured_at desc, then created_at desc
  const sortField = sort_by ?? "measured_at";
  const sortDirection = sort_order === "asc" ? "asc" : "desc";

  // Fetch paginated records and total in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_vitals.findMany({
      where,
      orderBy: [
        { [sortField]: sortDirection },
        { created_at: "desc" }, // deterministic
      ],
      skip,
      take: safeLimit,
    }),
    MyGlobal.prisma.healthcare_platform_vitals.count({ where }),
  ]);

  // Map results, convert any Date fields to string & tags.Format<'date-time'>
  const data = rows.map((row) => ({
    id: row.id,
    ehr_encounter_id: row.ehr_encounter_id,
    recorded_by_user_id: row.recorded_by_user_id,
    vital_type: row.vital_type,
    vital_value: row.vital_value,
    unit: row.unit,
    measured_at: toISOStringSafe(row.measured_at),
    created_at: toISOStringSafe(row.created_at),
  }));

  // Build pagination object using safe numeric types
  const pagination = {
    current: Number(safePage),
    limit: Number(safeLimit),
    records: total,
    pages: Math.ceil(total / Number(safeLimit)),
  };

  return {
    pagination,
    data,
  };
}
