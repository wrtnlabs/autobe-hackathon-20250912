import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformMedicalImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalImage";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Update metadata or classification for a medical image under a patient.
 *
 * Allows a technician user to update metadata (such as image type or clinical
 * context) for an existing medical image, without modifying the underlying
 * file. The endpoint enforces that the image exists, is not soft-deleted, and
 * belongs to the specified patient record. Only the editable metadata fields
 * can be updated. Returns the updated medical image metadata.
 *
 * - Technician must be authenticated and not soft-deleted (enforced by
 *   TechnicianPayload contract).
 * - Image and patient record must both exist and match.
 * - Updates are limited to metadata fields only.
 *
 * @param props - Request properties
 * @param props.technician - The authenticated technician performing the
 *   operation
 * @param props.patientRecordId - Unique identifier of the parent patient record
 *   (UUID)
 * @param props.medicalImageId - Unique identifier for the target medical image
 *   (UUID)
 * @param props.body - Fields to update for the medical image. Does not update
 *   the file/URI itself, only metadata.
 * @returns The updated medical image metadata with updated fields, all date and
 *   UUID values as string & tags.Format.
 * @throws {Error} If the medical image does not exist, is deleted, or does not
 *   belong to the specified patient record
 */
export async function puthealthcarePlatformTechnicianPatientRecordsPatientRecordIdMedicalImagesMedicalImageId(props: {
  technician: TechnicianPayload;
  patientRecordId: string & tags.Format<"uuid">;
  medicalImageId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformMedicalImage.IUpdate;
}): Promise<IHealthcarePlatformMedicalImage> {
  const { technician, patientRecordId, medicalImageId, body } = props;

  // Step 1: Look up the target image
  const image =
    await MyGlobal.prisma.healthcare_platform_medical_images.findFirst({
      where: {
        id: medicalImageId,
      },
    });
  if (!image) {
    throw new Error("Medical image not found or has been deleted");
  }

  // Step 2: Enforce parent relation: image must belong to the given patient record
  if (image.ehr_encounter_id !== patientRecordId) {
    throw new Error(
      "The medical image does not belong to the specified patient record",
    );
  }

  // Step 3: Update only allowed metadata fields
  const updated =
    await MyGlobal.prisma.healthcare_platform_medical_images.update({
      where: { id: medicalImageId },
      data: {
        image_type:
          typeof body.image_type === "string" ? body.image_type : undefined,
        image_metadata_json:
          body.image_metadata_json !== undefined
            ? body.image_metadata_json
            : undefined,
      },
    });

  // Step 4: Return fully typed, branded DTO
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
