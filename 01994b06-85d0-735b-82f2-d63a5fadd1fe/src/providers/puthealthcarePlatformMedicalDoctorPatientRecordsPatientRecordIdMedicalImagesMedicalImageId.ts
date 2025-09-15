import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformMedicalImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalImage";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Update metadata or classification for a medical image under a patient
 * (healthcare_platform_medical_images table).
 *
 * Allows authorized users (medical doctors) to revise metadata on an already
 * uploaded medical image, restricted to correcting image type or technical
 * metadata. Does not allow file/URI or uploader change. All updates are subject
 * to authorization, existence, and deletion checks.
 *
 * @param props - Contains authenticated doctor, patient record ID, image ID,
 *   and update body
 * @param props.medicalDoctor - Authenticated doctor requesting the update
 * @param props.patientRecordId - Target patient record UUID
 * @param props.medicalImageId - Target medical image UUID
 * @param props.body - Patchable fields: image_type and/or image_metadata_json
 * @returns The updated IHealthcarePlatformMedicalImage object
 * @throws {Error} If the patient record or image does not exist or is deleted
 * @throws {Error} If the authenticated doctor is not the original uploader of
 *   the medical image
 */
export async function puthealthcarePlatformMedicalDoctorPatientRecordsPatientRecordIdMedicalImagesMedicalImageId(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
  medicalImageId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformMedicalImage.IUpdate;
}): Promise<IHealthcarePlatformMedicalImage> {
  const { medicalDoctor, patientRecordId, medicalImageId, body } = props;

  // Ensure the patient record exists and is not soft-deleted
  const record =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { id: patientRecordId },
    });
  if (!record) {
    throw new Error("Patient record not found or has been deleted");
  }

  // Locate image and verify:
  // - matching image ID and parent record
  const image =
    await MyGlobal.prisma.healthcare_platform_medical_images.findFirst({
      where: {
        id: medicalImageId,
        ehr_encounter_id: patientRecordId,
      },
    });
  if (!image) {
    throw new Error("Medical image not found or has been deleted");
  }

  // Only the uploading doctor may edit
  if (image.uploaded_by_user_id !== medicalDoctor.id) {
    throw new Error("You cannot edit someone else's medical image");
  }

  // Only image_type and image_metadata_json are mutable post-upload
  const updated =
    await MyGlobal.prisma.healthcare_platform_medical_images.update({
      where: { id: medicalImageId },
      data: {
        image_type: body.image_type ?? undefined,
        image_metadata_json:
          body.image_metadata_json !== undefined
            ? body.image_metadata_json
            : undefined,
      },
    });

  return {
    id: updated.id,
    ehr_encounter_id: updated.ehr_encounter_id,
    uploaded_by_user_id: updated.uploaded_by_user_id,
    image_type: updated.image_type,
    image_uri: updated.image_uri,
    image_metadata_json: updated.image_metadata_json ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
  };
}
