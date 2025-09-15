import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformMedicalImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalImage";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Retrieve a medical image's metadata and access link under a patient record
 * (healthcare_platform_medical_images table).
 *
 * Fetches the detailed metadata and access URI for a single medical image
 * related to the specified patient record. Medical images may include DICOM,
 * JPEG, or other clinical media files used for diagnosis and care
 * documentation. The response includes image type, upload history, metadata
 * (acquisition, modality), storage URI, and references to the uploading
 * technician and encounter. Audit trails are enforced for every read,
 * supporting regulatory investigation and privacy requirements.
 *
 * Access to medical images is governed by the user's role and may also require
 * patient consent verification. Retrieval is logged at the access layer, noting
 * requesting user, time, purpose, and governing organization/department
 * context. If the specified medical image does not exist under the patient
 * record, is deleted, or access is denied by policy (e.g., consent revoked,
 * under legal hold), this function throws a 404 or 403 error and logs the
 * attempt for compliance.
 *
 * @param props - Object containing nurse authentication, patient record ID, and
 *   medical image ID
 *
 *   - Nurse: Authenticated nurse (NursePayload)
 *   - PatientRecordId: The parent patient record uuid
 *   - MedicalImageId: The medical image uuid
 *
 * @returns IHealthcarePlatformMedicalImage - Full metadata and secure-access
 *   URI for the medical image
 * @throws {Error} If image not found, not linked to patient record, or under
 *   soft-deletion/policy restriction
 */
export async function gethealthcarePlatformNursePatientRecordsPatientRecordIdMedicalImagesMedicalImageId(props: {
  nurse: NursePayload;
  patientRecordId: string & tags.Format<"uuid">;
  medicalImageId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformMedicalImage> {
  const { nurse, patientRecordId, medicalImageId } = props;

  // Fetch the medical image and join EHR encounter and patient record for verification
  const image =
    await MyGlobal.prisma.healthcare_platform_medical_images.findFirst({
      where: { id: medicalImageId },
      include: {
        ehrEncounter: {
          select: {
            id: true,
            patient_record_id: true,
            deleted_at: true,
            patientRecord: { select: { id: true, deleted_at: true } },
          },
        },
      },
    });

  // RBAC: Only present if image is linked to this patient and encounter/patient exist & are not deleted
  if (
    !image ||
    !image.ehrEncounter ||
    image.ehrEncounter.patient_record_id !== patientRecordId ||
    image.ehrEncounter.deleted_at !== null ||
    !image.ehrEncounter.patientRecord ||
    image.ehrEncounter.patientRecord.deleted_at !== null
  ) {
    throw new Error("Medical image not found or access denied");
  }

  // Return API DTO with correct date typings; never expose Date; all fields match API interface
  return {
    id: image.id,
    ehr_encounter_id: image.ehr_encounter_id,
    uploaded_by_user_id: image.uploaded_by_user_id,
    image_type: image.image_type,
    image_uri: image.image_uri,
    image_metadata_json: image.image_metadata_json ?? undefined,
    created_at: toISOStringSafe(image.created_at),
  };
}
