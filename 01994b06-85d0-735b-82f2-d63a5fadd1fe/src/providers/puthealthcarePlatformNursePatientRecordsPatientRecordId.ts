import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Update an existing patient record identified by patientRecordId in the main
 * patient records schema.
 *
 * This endpoint enables authorized nurses to update permitted fields on a
 * patient record, including full name, demographics, status, department,
 * gender, and soft-deletion status. Organization linkage and the primary user
 * reference cannot be modified. The function ensures regulatory, consent, and
 * audit boundaries by enforcing that only active (not soft-deleted) patient
 * records can be updated and that all date values are returned as ISO 8601
 * strings.
 *
 * Auditing, versioning, and compliance triggers are honored to the extent
 * reflected in current schema. Future versions may expand checks for legal hold
 * and consent as additional fields and relations are implemented.
 *
 * @param props - Properties for the update operation:
 * @param props.nurse - The authenticated nurse context (must be valid and
 *   active)
 * @param props.patientRecordId - UUID of the patient record to update
 * @param props.body - Fields to update, following
 *   IHealthcarePlatformPatientRecord.IUpdate contract
 * @returns The fully updated patient record, all fields normalized and
 *   type-compliant
 * @throws {Error} When the patient record is not found or is already
 *   soft-deleted (archived)
 */
export async function puthealthcarePlatformNursePatientRecordsPatientRecordId(props: {
  nurse: NursePayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformPatientRecord.IUpdate;
}): Promise<IHealthcarePlatformPatientRecord> {
  // Step 1: Enforce soft-delete and existence check
  const record =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: {
        id: props.patientRecordId,
        deleted_at: null,
      },
    });
  if (!record) {
    throw new Error("Patient record not found or is archived.");
  }

  // Step 2: Update allowed mutable fields only, using undefined for missing (skip), null where appropriate
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_patient_records.update({
      where: { id: props.patientRecordId },
      data: {
        department_id: Object.prototype.hasOwnProperty.call(
          props.body,
          "department_id",
        )
          ? (props.body.department_id ?? null)
          : undefined,
        external_patient_number: Object.prototype.hasOwnProperty.call(
          props.body,
          "external_patient_number",
        )
          ? (props.body.external_patient_number ?? null)
          : undefined,
        full_name: Object.prototype.hasOwnProperty.call(props.body, "full_name")
          ? props.body.full_name
          : undefined,
        dob: Object.prototype.hasOwnProperty.call(props.body, "dob")
          ? props.body.dob
          : undefined,
        gender: Object.prototype.hasOwnProperty.call(props.body, "gender")
          ? (props.body.gender ?? null)
          : undefined,
        status: Object.prototype.hasOwnProperty.call(props.body, "status")
          ? props.body.status
          : undefined,
        demographics_json: Object.prototype.hasOwnProperty.call(
          props.body,
          "demographics_json",
        )
          ? (props.body.demographics_json ?? null)
          : undefined,
        deleted_at: Object.prototype.hasOwnProperty.call(
          props.body,
          "deleted_at",
        )
          ? (props.body.deleted_at ?? null)
          : undefined,
        updated_at: now,
      },
    });

  // Step 3: Return the updated record, normalizing all values for DTO/contract
  return {
    id: updated.id,
    organization_id: updated.organization_id,
    department_id: updated.department_id ?? null,
    patient_user_id: updated.patient_user_id,
    external_patient_number: updated.external_patient_number ?? null,
    full_name: updated.full_name,
    dob: toISOStringSafe(updated.dob),
    gender: updated.gender ?? null,
    status: updated.status,
    demographics_json: updated.demographics_json ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
