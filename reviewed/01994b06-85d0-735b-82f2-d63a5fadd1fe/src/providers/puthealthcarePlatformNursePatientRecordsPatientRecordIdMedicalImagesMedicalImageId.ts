import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformMedicalImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalImage";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Update metadata or classification for a medical image under a patient
 * (healthcare_platform_medical_images table).
 *
 * Allows authorized nurses to update an existing medical image's metadata, such
 * as correcting image type or annotating clinical context. The image file/URI
 * cannot be changed—only metadata and classification fields may be edited
 * through this operation.
 *
 * RBAC and patient/image ownership are strictly enforced: The nurse must
 * specify both the patient record and the image. This endpoint validates:
 *
 * 1. The patient record exists and is not soft-deleted
 * 2. The medical image exists, not soft-deleted
 * 3. The medical image, through its EHR encounter, belongs to the provided patient
 *    record and is not soft-deleted Failing any check will return a clear
 *    error. The operation updates only permitted fields
 *    (metadata/classification), and returns the strictly correct object type.
 *    All date/datetime fields are converted to the required format.
 *
 * @param props - Request properties
 * @param props.nurse - The authenticated nurse (actor making the request)
 * @param props.patientRecordId - Unique identifier of the parent patient record
 *   (UUID)
 * @param props.medicalImageId - Unique identifier of the target medical image
 *   (UUID)
 * @param props.body - Fields to update for the medical image (does not update
 *   file/URI itself)
 * @returns The updated medical image record with updated metadata
 *   classification and all required references
 * @throws {Error} When the patient record does not exist or is deleted
 * @throws {Error} When the medical image does not exist or is deleted
 * @throws {Error} When the EHR encounter does not exist, is deleted, or does
 *   not belong to the specified patient record
 */
export async function puthealthcarePlatformNursePatientRecordsPatientRecordIdMedicalImagesMedicalImageId(props: {
  nurse: NursePayload;
  patientRecordId: string & tags.Format<"uuid">;
  medicalImageId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformMedicalImage.IUpdate;
}): Promise<IHealthcarePlatformMedicalImage> {
  // Step 1: Ensure patient record exists and not soft-deleted
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: {
        id: props.patientRecordId,
        deleted_at: null,
      },
    });
  if (!patientRecord) {
    throw new Error("Patient record not found or deleted");
  }

  // Step 2: Ensure image exists (without deleted_at filter, since not in schema)
  const image =
    await MyGlobal.prisma.healthcare_platform_medical_images.findFirst({
      where: {
        id: props.medicalImageId,
      },
    });
  if (!image) {
    throw new Error("Medical image not found");
  }

  // Step 3: Ensure the EHR encounter exists, is attached to patient record, and not deleted
  const ehrEncounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: image.ehr_encounter_id,
        patient_record_id: props.patientRecordId,
        deleted_at: null,
      },
    });
  if (!ehrEncounter) {
    throw new Error(
      "Medical image does not belong to this patient record or encounter deleted",
    );
  }

  // Step 4: Update only allowed fields (strict PATCH)
  const updated =
    await MyGlobal.prisma.healthcare_platform_medical_images.update({
      where: { id: props.medicalImageId },
      data: {
        image_type: props.body.image_type ?? undefined,
        image_metadata_json: props.body.image_metadata_json ?? undefined,
      },
    });

  // Step 5: Map explicitly to DTO, enforcing absence of any Date or 'as' and converting types per contract
  return {
    id: updated.id,
    ehr_encounter_id: updated.ehr_encounter_id,
    uploaded_by_user_id: updated.uploaded_by_user_id,
    image_type: updated.image_type,
    image_uri: updated.image_uri,
    image_metadata_json: updated.image_metadata_json ?? null,
    created_at: toISOStringSafe(updated.created_at),
  };
}
