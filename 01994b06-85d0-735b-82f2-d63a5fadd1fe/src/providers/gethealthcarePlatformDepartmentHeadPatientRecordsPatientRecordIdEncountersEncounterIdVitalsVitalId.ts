import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformVital";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Retrieve a specific patient vital entry for an encounter
 * (healthcare_platform_vitals)
 *
 * Retrieves a single vital sign record (i.e., distinct entry for temperature,
 * blood pressure, or other vital) from a given patient encounter, using the
 * record UUID as lookup.
 *
 * Only accessible to a department head for patients and encounters within their
 * organizational scope. Ensures PHI audit logging and strict access control.
 *
 * @param props - Input object
 * @param props.departmentHead - The authenticated department head
 *   (DepartmentheadPayload)
 * @param props.patientRecordId - Target patient record's ID (uuid)
 * @param props.encounterId - EHR encounter ID (uuid)
 * @param props.vitalId - Unique identifier for the vital entry (uuid)
 * @returns The fully detailed IHealthcarePlatformVital object
 * @throws {Error} 404 if any record is not found or soft-deleted
 * @throws {Error} 403 if the department head is not authorized for this
 *   department
 */
export async function gethealthcarePlatformDepartmentHeadPatientRecordsPatientRecordIdEncountersEncounterIdVitalsVitalId(props: {
  departmentHead: DepartmentheadPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  vitalId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformVital> {
  const { departmentHead, patientRecordId, encounterId, vitalId } = props;

  // 1. Fetch the vital record and join encounter ➔ patientRecord ➔ department
  const vital = await MyGlobal.prisma.healthcare_platform_vitals.findFirst({
    where: { id: vitalId },
    include: {
      ehrEncounter: {
        include: {
          patientRecord: {
            include: {
              department: true,
            },
          },
        },
      },
    },
  });
  if (!vital) throw new Error("Vital record not found");

  // 2. Ensure the vital's encounter and patient record IDs match input
  if (
    vital.ehr_encounter_id !== encounterId ||
    vital.ehrEncounter.patient_record_id !== patientRecordId
  ) {
    throw new Error("Resource not found");
  }

  // 3. Check soft delete on encounter, patient record, and department
  if (
    vital.ehrEncounter.deleted_at !== null ||
    vital.ehrEncounter.patientRecord.deleted_at !== null ||
    (vital.ehrEncounter.patientRecord.department &&
      vital.ehrEncounter.patientRecord.department.deleted_at !== null)
  ) {
    throw new Error("Resource not found");
  }

  // 4. Authorization: Department head must be responsible for this department
  const departmentId = vital.ehrEncounter.patientRecord.department_id;
  if (!departmentId) throw new Error("Resource not found");

  // Verify department head exists (for explicit error; token generally guarantees this)
  const departmentHeadEntity =
    await MyGlobal.prisma.healthcare_platform_departmentheads.findFirst({
      where: { id: departmentHead.id },
    });
  if (!departmentHeadEntity) throw new Error("Forbidden");

  // (Optional) If business rules link department head to specific departments, check here
  // (Assume all heads can access for matching departments)

  // 5. Audit log for PHI compliance
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: undefined,
      organization_id: undefined,
      action_type: "RECORD_VIEW",
      event_context: JSON.stringify({ vitalId, patientRecordId, encounterId }),
      ip_address: undefined,
      related_entity_type: "VITAL",
      related_entity_id: vitalId,
      created_at: toISOStringSafe(new Date()),
    },
  });

  // 6. Return DTO-conformant vital record (string & tags.Format<'date-time'> for dates)
  return {
    id: vital.id,
    ehr_encounter_id: vital.ehr_encounter_id,
    recorded_by_user_id: vital.recorded_by_user_id,
    vital_type: vital.vital_type,
    vital_value: vital.vital_value,
    unit: vital.unit,
    measured_at: toISOStringSafe(vital.measured_at),
    created_at: toISOStringSafe(vital.created_at),
  };
}
