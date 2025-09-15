import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformMedicalImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalImage";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Retrieve a medical image's metadata and access link under a patient record
 * (healthcare_platform_medical_images table).
 *
 * Fetches detailed metadata and a secure URI for a single medical image linked
 * to a specified patient record. Only accessible to authorized technicians,
 * this operation ensures record/image association and RBAC enforcement. If the
 * image is not under the patient record or is not found, a 404 error is thrown.
 * The response includes image details, technical metadata, and upload
 * provenance.
 *
 * @param props - Input object containing the technician identity, patient
 *   record ID, and medical image ID
 * @param props.technician - Authenticated technician payload (RBAC via
 *   decorator)
 * @param props.patientRecordId - Unique identifier for the parent patient
 *   record (UUID)
 * @param props.medicalImageId - Unique identifier for the medical image (UUID)
 * @returns Full metadata record for the medical image, including image type,
 *   secure URI, and provenance fields
 * @throws {Error} If either the image or the parent encounter cannot be found,
 *   or the image does not belong to the specified patient record
 */
export async function gethealthcarePlatformTechnicianPatientRecordsPatientRecordIdMedicalImagesMedicalImageId(props: {
  technician: TechnicianPayload;
  patientRecordId: string & tags.Format<"uuid">;
  medicalImageId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformMedicalImage> {
  const { technician, patientRecordId, medicalImageId } = props;

  // Step 1: Load the image by its UUID
  const image =
    await MyGlobal.prisma.healthcare_platform_medical_images.findUnique({
      where: { id: medicalImageId },
    });

  if (!image) {
    throw new Error("Medical image not found.");
  }

  // Step 2: Load the EHR encounter referenced by the image
  const ehrEncounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findUnique({
      where: { id: image.ehr_encounter_id },
      select: { patient_record_id: true },
    });

  if (!ehrEncounter || ehrEncounter.patient_record_id !== patientRecordId) {
    throw new Error("Medical image not under the specified patient record.");
  }

  // Step 3: Return response matching the strict DTO contract
  return {
    id: image.id as string & tags.Format<"uuid">,
    ehr_encounter_id: image.ehr_encounter_id as string & tags.Format<"uuid">,
    uploaded_by_user_id: image.uploaded_by_user_id as string &
      tags.Format<"uuid">,
    image_type: image.image_type,
    image_uri: image.image_uri,
    image_metadata_json: image.image_metadata_json ?? undefined,
    created_at: toISOStringSafe(image.created_at),
  };
}
