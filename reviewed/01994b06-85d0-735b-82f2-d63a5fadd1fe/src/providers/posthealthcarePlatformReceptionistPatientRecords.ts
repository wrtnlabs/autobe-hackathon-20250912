import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformPatientRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformPatientRecord";
import { ReceptionistPayload } from "../decorators/payload/ReceptionistPayload";

/**
 * Create a new patient record in healthcare_platform_patient_records table.
 *
 * This operation creates a new patient record within the healthcare platform.
 * It enforces uniqueness of the patient (by patient_user_id) within the
 * organization, initializes required metadata, and assigns all business fields
 * and audit timestamps. Creation will fail if an active (not soft-deleted)
 * patient record already exists for the same patient_user_id.
 *
 * Authorization: Only authenticated receptionists may use this endpoint
 * (authorization is validated by the decorator, not in this function).
 *
 * @param props - Properties for patient record creation
 * @param props.receptionist - The authenticated receptionist payload (with user
 *   id and role type)
 * @param props.body - Request body containing patient record creation data
 *   (organization_id, department_id, patient_user_id, full_name, dob, etc)
 * @returns Fully initialized patient record entity, including system-generated
 *   id, timestamps, and all business metadata
 * @throws {Error} When a patient record already exists for the given
 *   patient_user_id and is not soft-deleted
 */
export async function posthealthcarePlatformReceptionistPatientRecords(props: {
  receptionist: ReceptionistPayload;
  body: IHealthcarePlatformPatientRecord.ICreate;
}): Promise<IHealthcarePlatformPatientRecord> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Check for existing non-deleted record for this patient user
  const duplicate =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: {
        patient_user_id: props.body.patient_user_id,
        deleted_at: null,
      },
    });
  if (duplicate) {
    throw new Error("Patient record already exists");
  }

  // Insert new patient record
  const created =
    await MyGlobal.prisma.healthcare_platform_patient_records.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        organization_id: props.body.organization_id,
        department_id: props.body.department_id ?? undefined,
        patient_user_id: props.body.patient_user_id,
        external_patient_number:
          props.body.external_patient_number ?? undefined,
        full_name: props.body.full_name,
        dob: props.body.dob,
        gender: props.body.gender ?? undefined,
        status: props.body.status,
        demographics_json: props.body.demographics_json ?? undefined,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

  return {
    id: created.id,
    organization_id: created.organization_id,
    department_id:
      typeof created.department_id === "string" ? created.department_id : null,
    patient_user_id: created.patient_user_id,
    external_patient_number:
      typeof created.external_patient_number === "string"
        ? created.external_patient_number
        : null,
    full_name: created.full_name,
    dob: toISOStringSafe(created.dob),
    gender: typeof created.gender === "string" ? created.gender : null,
    status: created.status,
    demographics_json:
      typeof created.demographics_json === "string"
        ? created.demographics_json
        : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
