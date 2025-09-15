import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Permanently delete a medical image for a patient (hard delete –
 * healthcare_platform_medical_images).
 *
 * This operation removes a specific medical image and its metadata from the
 * system. It enforces hard deletion, as the healthcare_platform_medical_images
 * table has no soft-delete field. Only the technician who originally uploaded
 * the image may perform this operation. Deletion is prohibited if the parent
 * patient record is under active legal or compliance hold (determined by the
 * presence of a healthcare_platform_record_locks row where released_at is
 * null). Unauthorized or ineligible attempts are rejected. Audit logging of the
 * deletion should be implemented externally by the caller or downstream.
 *
 * @param props - Request properties
 * @param props.technician - The authenticated technician requesting the
 *   deletion (role enforced)
 * @param props.patientRecordId - UUID of the patient record to which the image
 *   belongs
 * @param props.medicalImageId - UUID of the medical image to delete
 * @returns Void (no response body for 204 success)
 * @throws {Error} 404 if image not found or does not belong to the patient
 *   record
 * @throws {Error} 403 if user is not authorized (not uploading technician) or
 *   if patient record is under hold
 */
export async function deletehealthcarePlatformTechnicianPatientRecordsPatientRecordIdMedicalImagesMedicalImageId(props: {
  technician: TechnicianPayload;
  patientRecordId: string & tags.Format<"uuid">;
  medicalImageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { technician, patientRecordId, medicalImageId } = props;
  const image =
    await MyGlobal.prisma.healthcare_platform_medical_images.findFirst({
      where: { id: medicalImageId },
      include: {
        ehrEncounter: {
          select: { patient_record_id: true },
        },
      },
    });
  if (!image) throw new Error("Medical image not found");
  if (
    !image.ehrEncounter ||
    image.ehrEncounter.patient_record_id !== patientRecordId
  ) {
    throw new Error(
      "Medical image does not belong to the specified patient record",
    );
  }
  if (image.uploaded_by_user_id !== technician.id) {
    throw new Error(
      "Forbidden: Only uploading technician may delete this medical image.",
    );
  }
  const recordLock =
    await MyGlobal.prisma.healthcare_platform_record_locks.findFirst({
      where: {
        patient_record_id: patientRecordId,
        released_at: null,
      },
    });
  if (recordLock) {
    throw new Error("Cannot delete: Patient record is under legal/hold");
  }
  await MyGlobal.prisma.healthcare_platform_medical_images.delete({
    where: { id: medicalImageId },
  });
}
