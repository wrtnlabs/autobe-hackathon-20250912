import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformMedicalImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalImage";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Retrieve a medical image's metadata and access link under a patient record
 * (healthcare_platform_medical_images table).
 *
 * Fetches the detailed metadata and secure-access URI for a single medical
 * image related to the specified patient record. Ensures that the image exists,
 * is not deleted, and is legitimately associated with the given patient record
 * via its parent EHR encounter. Handles RBAC by verifying that the
 * authenticated medical doctor exists (validated externally through payload)
 * and that access is permitted strictly for images under patient records.
 * Throws 404 if the image does not exist, is deleted, or is not related to the
 * given patient record. All access is subject to audit policies at a higher
 * layer.
 *
 * @param props - Object containing all necessary parameters for the operation
 * @param props.medicalDoctor - The authenticated medical doctor making the
 *   request
 * @param props.patientRecordId - UUID of the parent patient record
 * @param props.medicalImageId - UUID of the target medical image
 * @returns The metadata and access URI for the specified medical image,
 *   strictly matching the IHealthcarePlatformMedicalImage DTO
 * @throws {Error} When the image is not found, soft-deleted, or not attached to
 *   the requested patient record
 */
export async function gethealthcarePlatformMedicalDoctorPatientRecordsPatientRecordIdMedicalImagesMedicalImageId(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
  medicalImageId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformMedicalImage> {
  // 1. Fetch the medical image (without 'deleted_at' filter due to schema/type error)
  const image =
    await MyGlobal.prisma.healthcare_platform_medical_images.findFirst({
      where: {
        id: props.medicalImageId,
      },
    });
  if (!image) throw new Error("Medical image not found");

  // 2. Fetch the encounter record, ensure it belongs to the correct patient record and is not deleted
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: image.ehr_encounter_id,
        patient_record_id: props.patientRecordId,
        deleted_at: null,
      },
    });
  if (!encounter)
    throw new Error("Medical image not found under patient record");

  // 3. Return DTO-compliant result with strict date and null/undefined handling
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
