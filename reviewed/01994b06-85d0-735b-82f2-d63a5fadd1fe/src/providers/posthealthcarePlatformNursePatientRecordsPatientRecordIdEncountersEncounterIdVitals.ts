import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformVital";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Create a new patient vital sign entry for an encounter
 * (healthcare_platform_vitals)
 *
 * This function creates a new vital entry for a specific patient EHR encounter,
 * performed by a nurse. It enforces strong validation on encounter and nurse
 * assignment, validates the clinical integrity of the measurement (vital
 * type/unit/range), and prevents duplicate submissions for the same type and
 * measurement time. All entries are attributed and auditable, supporting PHI
 * compliance workflows. Only authorized nurses assigned to the encounter may
 * submit. Errors are thrown for missing dependencies, permissions, or invalid
 * data.
 *
 * @param props - Operation properties
 * @param props.nurse - Authenticated nurse payload (must match assigned
 *   provider of encounter)
 * @param props.patientRecordId - Active patient record unique identifier (UUID)
 * @param props.encounterId - EHR encounter identifier (UUID, must be for
 *   patient record)
 * @param props.body - Vital entry input (vital type, value, unit, measured_at,
 *   etc.)
 * @returns The created vital entry with full attribution
 * @throws {Error} If patient record is missing/inactive, encounter
 *   missing/inactive, nurse unauthorized, duplicate entry, or invalid
 *   measurement
 */
export async function posthealthcarePlatformNursePatientRecordsPatientRecordIdEncountersEncounterIdVitals(props: {
  nurse: NursePayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformVital.ICreate;
}): Promise<IHealthcarePlatformVital> {
  // Validate active patient record
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { id: props.patientRecordId, deleted_at: null, status: "active" },
    });
  if (!patientRecord) throw new Error("Patient record not found or inactive");

  // Validate active encounter for the patient
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: props.encounterId,
        patient_record_id: props.patientRecordId,
        deleted_at: null,
        status: "active",
      },
    });
  if (!encounter)
    throw new Error("EHR encounter not found or inactive for this patient");

  // Ensure nurse is the provider for this encounter
  if (encounter.provider_user_id !== props.nurse.id)
    throw new Error("Forbidden: Nurse not assigned to this encounter");

  // Deconstruct & validate vital entry input
  const { vital_type, vital_value, unit, measured_at, ehr_encounter_id } =
    props.body;
  if (ehr_encounter_id !== props.encounterId)
    throw new Error("EHR encounter id in body does not match parameter");

  // Validate business rules for vital_type, unit, and value range (expand as needed)
  if (vital_type === "heart_rate") {
    if (unit !== "bpm" || vital_value < 20 || vital_value > 250)
      throw new Error("Invalid heart rate value or unit");
  } else if (vital_type === "temp_c") {
    if (unit !== "C" || vital_value < 25 || vital_value > 45)
      throw new Error("Invalid temperature value or unit");
  } else if (vital_type === "bp_systolic") {
    if (unit !== "mmHg" || vital_value < 30 || vital_value > 300)
      throw new Error("Invalid systolic BP value or unit");
  } else if (vital_type === "bp_diastolic") {
    if (unit !== "mmHg" || vital_value < 10 || vital_value > 200)
      throw new Error("Invalid diastolic BP value or unit");
  } else if (vital_type === "respiratory_rate") {
    if (unit !== "rpm" || vital_value < 2 || vital_value > 80)
      throw new Error("Invalid respiratory rate value or unit");
  } else {
    throw new Error("Unknown or unsupported vital_type");
  }

  // Prevent duplicate measurement for this encounter, type, and measurement time
  const duplicate = await MyGlobal.prisma.healthcare_platform_vitals.findFirst({
    where: { ehr_encounter_id: props.encounterId, vital_type, measured_at },
  });
  if (duplicate) {
    throw new Error("Duplicate vital entry for this type and measured_at");
  }

  // Construct and persist the new vital entry
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.healthcare_platform_vitals.create({
    data: {
      id: v4(),
      ehr_encounter_id: props.encounterId,
      recorded_by_user_id: props.nurse.id,
      vital_type,
      vital_value,
      unit,
      measured_at,
      created_at: now,
    },
  });

  return {
    id: created.id,
    ehr_encounter_id: created.ehr_encounter_id,
    recorded_by_user_id: created.recorded_by_user_id,
    vital_type: created.vital_type,
    vital_value: created.vital_value,
    unit: created.unit,
    measured_at: created.measured_at,
    created_at: created.created_at,
  };
}
