import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformMedicalImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalImage";
import { PatientPayload } from "../decorators/payload/PatientPayload";

/**
 * Retrieve a medical image's metadata and access link under a patient record
 * (healthcare_platform_medical_images).
 *
 * This endpoint allows an authenticated patient to fetch secure metadata and
 * file URI for a clinical medical image record only if it is associated with
 * their own patient record in the system. Strict access control and audit rules
 * are enforced — if the patient does not own the specified patient record, or
 * the image is not linked to that record, or either record is soft-deleted, the
 * function throws an error. Returns full metadata, including type, uploaded
 * timestamp, file URI, and optional technical metadata (all fields as required
 * by the DTO contract). No image binaries are delivered, only the access
 * metadata/URI.
 *
 * @param props -
 * @returns The medical image DTO (metadata and access URI)
 * @throws {Error} If record is not found, not owned by patient, or image not
 *   linked
 * @field patient The authenticated patient payload (from PatientAuth)
 * @field patientRecordId The target patient record UUID (must be owned by this patient)
 * @field medicalImageId The specific medical image UUID (must be linked to this record)
 */
export async function gethealthcarePlatformPatientPatientRecordsPatientRecordIdMedicalImagesMedicalImageId(props: {
  patient: PatientPayload;
  patientRecordId: string & tags.Format<"uuid">;
  medicalImageId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformMedicalImage> {
  const { patient, patientRecordId, medicalImageId } = props;

  // Find active (not-deleted) patient record matching user
  const record =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: {
        id: patientRecordId,
        deleted_at: null,
        patient_user_id: patient.id,
      },
    });
  if (!record)
    throw new Error(
      "Patient record not found, deleted, or not owned by this patient",
    );

  // Find the medical image linked to the record
  const image =
    await MyGlobal.prisma.healthcare_platform_medical_images.findFirst({
      where: {
        id: medicalImageId,
        ehr_encounter_id: record.id,
      },
    });
  if (!image)
    throw new Error(
      "Medical image not found for this record, or access denied",
    );

  // Map to DTO contract, ensuring correct null/undefined, and correct date/time format
  const result = {
    id: image.id,
    ehr_encounter_id: image.ehr_encounter_id,
    uploaded_by_user_id: image.uploaded_by_user_id,
    image_type: image.image_type,
    image_uri: image.image_uri,
    image_metadata_json:
      image.image_metadata_json === null
        ? null
        : (image.image_metadata_json ?? undefined),
    created_at: toISOStringSafe(image.created_at),
  } satisfies IHealthcarePlatformMedicalImage;

  return result;
}
