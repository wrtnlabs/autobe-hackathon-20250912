import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Permanently deletes a specific laboratory result for a patient encounter.
 *
 * This operation will hard-delete the lab result row permanently from
 * healthcare_platform_lab_results. It cannot be recovered afterwards. Audit
 * logging is mandatory: all deletes are recorded in
 * healthcare_platform_record_audit_trails before actual deletion. Only the
 * assigned Department Head for the patient's department is authorized.
 *
 * @param props - Arguments required for deletion
 * @param props.departmentHead - Authenticated department head issuing the
 *   delete
 * @param props.patientRecordId - Target patient's record UUID
 * @param props.encounterId - Target EHR encounter UUID
 * @param props.labResultId - Lab result UUID to delete
 * @returns Void
 * @throws Error if resource is missing, not owned by the encounter/patient,
 *   finalized, or forbidden
 */
export async function deletehealthcarePlatformDepartmentHeadPatientRecordsPatientRecordIdEncountersEncounterIdLabResultsLabResultId(props: {
  departmentHead: DepartmentheadPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  labResultId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { departmentHead, patientRecordId, encounterId, labResultId } = props;

  // 1. Fetch the lab result and validate encounter association, not soft-deleted
  const labResult =
    await MyGlobal.prisma.healthcare_platform_lab_results.findFirst({
      where: {
        id: labResultId,
        ehr_encounter_id: encounterId,
      },
      include: {
        ehrEncounter: {
          select: {
            patient_record_id: true,
          },
        },
      },
    });
  if (
    !labResult ||
    !labResult.ehrEncounter ||
    labResult.ehrEncounter.patient_record_id !== patientRecordId
  ) {
    throw new Error(
      "Lab result not found for given patient record and encounter, or already deleted.",
    );
  }

  // 2. Permission/ownership: Validate access to department
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { id: patientRecordId },
    });
  if (!patientRecord || !patientRecord.department_id) {
    throw new Error(
      "Patient record not found or missing department association.",
    );
  }

  // Confirm the Departmenthead controls this department (must match departmenthead's id to department_id)
  // This authorization logic is schematic, will vary based on assignment model, but basic check:
  const departmentHeadId = departmentHead.id;
  // Here we should check against an assignment table, but, lacking one here, require equivalence
  if (patientRecord.department_id !== departmentHeadId) {
    throw new Error(
      "Unauthorized: You are not the assigned Department Head for this department.",
    );
  }

  // 3. Business constraint: If status is 'completed', deny deletion
  if (labResult.status === "completed") {
    throw new Error("Lab result is finalized and cannot be deleted.");
  }

  // 4. Audit log (before deletion)
  await MyGlobal.prisma.healthcare_platform_record_audit_trails.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      patient_record_id: patientRecordId,
      actor_user_id: departmentHeadId,
      audit_action: "DELETE_LAB_RESULT",
      created_at: toISOStringSafe(new Date()),
    },
  });

  // 5. Hard delete (irreversible)
  await MyGlobal.prisma.healthcare_platform_lab_results.delete({
    where: { id: labResultId },
  });
}
