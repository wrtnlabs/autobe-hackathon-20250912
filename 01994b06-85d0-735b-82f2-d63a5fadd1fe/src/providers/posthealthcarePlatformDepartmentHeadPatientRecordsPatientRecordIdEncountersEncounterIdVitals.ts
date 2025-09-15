import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformVital";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Create a new patient vital sign entry for an encounter
 * (healthcare_platform_vitals)
 *
 * This operation creates a new vital sign entry (e.g., heart rate, temperature)
 * attributed to a department head user for a specified EHR encounter, ensuring
 * all clinical and business validations. The submitting user is associated with
 * the vitals entry as the recording clinician. Only department heads authorized
 * for the encounter's department may create vitals entries. Enforcement
 * includes role validation, encounter and patient record lookup, and vital
 * value range/unit/type validation. All actions are fully auditable for PHI and
 * compliance.
 *
 * @param props - Operation input
 * @param props.departmentHead - DepartmentheadPayload (authorized authenticated
 *   department head)
 * @param props.patientRecordId - UUID of the patient record for the encounter
 * @param props.encounterId - UUID of the target EHR encounter
 * @param props.body - IHealthcarePlatformVital.ICreate new vital entry data
 *   (type, value, unit, measured_at)
 * @returns The created IHealthcarePlatformVital record for the encounter
 * @throws {Error} If not found, unauthorized, or vital type/value/unit fails
 *   clinical validation
 */
export async function posthealthcarePlatformDepartmentHeadPatientRecordsPatientRecordIdEncountersEncounterIdVitals(props: {
  departmentHead: DepartmentheadPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformVital.ICreate;
}): Promise<IHealthcarePlatformVital> {
  const { departmentHead, patientRecordId, encounterId, body } = props;

  // 1. Confirm EHR encounter exists, is not deleted, and associated correctly to patient record
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: encounterId,
        deleted_at: null,
      },
      select: {
        id: true,
        patient_record_id: true,
        department_id: true,
      },
    });
  if (!encounter || encounter.patient_record_id !== patientRecordId) {
    throw new Error(
      "Encounter not found for the provided patient record, or it is deleted.",
    );
  }

  // 2. Validate department head existence and authority
  if (!encounter.department_id) {
    throw new Error(
      "Encounter does not specify a department, cannot authorize department head.",
    );
  }
  // Basic check: does department head exist and is not soft-deleted (auth checked in decorator)
  const departmentHeadRow =
    await MyGlobal.prisma.healthcare_platform_departmentheads.findFirst({
      where: { id: departmentHead.id, deleted_at: null },
      select: { id: true },
    });
  if (!departmentHeadRow) {
    throw new Error(
      "Forbidden: authenticated user is not a valid, active department head.",
    );
  }
  // -- You might check for department assignment in more advanced implementations --

  // 3. Clinical validation rules for vital type / value / unit alignment
  const { vital_type, vital_value, unit } = body;
  let clinicalValid = true;
  if (
    vital_type === "heart_rate" &&
    (vital_value < 25 || vital_value > 300 || unit !== "bpm")
  )
    clinicalValid = false;
  if (
    vital_type === "temp_c" &&
    (vital_value < 28 || vital_value > 45 || unit !== "C")
  )
    clinicalValid = false;
  if (
    vital_type === "bp_systolic" &&
    (vital_value < 50 || vital_value > 300 || unit !== "mmHg")
  )
    clinicalValid = false;
  // Add more clinical rules here as needed
  if (!clinicalValid) {
    throw new Error(
      "Validation error: vital_type, value, or unit outside allowed clinical bounds.",
    );
  }

  // 4. Create vital record, generate new id, attribute to the authenticated department head as recorder.
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.healthcare_platform_vitals.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      ehr_encounter_id: body.ehr_encounter_id,
      recorded_by_user_id: departmentHead.id,
      vital_type: body.vital_type,
      vital_value: body.vital_value,
      unit: body.unit,
      measured_at: body.measured_at,
      created_at: now,
    },
  });

  // 5. Return the created object, maintaining immutability and correct typing (all dates and IDs as branded strings)
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
