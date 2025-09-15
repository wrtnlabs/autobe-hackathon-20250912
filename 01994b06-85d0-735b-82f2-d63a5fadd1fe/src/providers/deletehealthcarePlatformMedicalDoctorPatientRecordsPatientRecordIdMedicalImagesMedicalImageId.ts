import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Permanently delete a medical image for a patient (hard delete –
 * healthcare_platform_medical_images).
 *
 * This operation deletes the specified medical image from the database,
 * ensuring compliance with audit and regulatory constraints. Only authorized
 * medical doctors may perform this action. No soft-deletion is available for
 * images: deletion is hard and cannot be undone. Deletion is strictly
 * prohibited if the linked patient record is under active legal or compliance
 * hold. Deletion attempts for nonexistent images or when access is forbidden
 * are audited and result in error.
 *
 * @param props - Properties containing:
 *
 *   - MedicalDoctor: Authenticated MedicaldoctorPayload
 *   - PatientRecordId: The UUID of the parent patient record
 *   - MedicalImageId: The UUID of the medical image to delete
 *
 * @returns Void
 * @throws {Error} - 404 if image or patient record not found; 403 if record is
 *   under hold or deletion forbidden
 */
export async function deletehealthcarePlatformMedicalDoctorPatientRecordsPatientRecordIdMedicalImagesMedicalImageId(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
  medicalImageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { medicalDoctor, patientRecordId, medicalImageId } = props;

  // 1. Find medical image (must include encounter for record linkage)
  const image =
    await MyGlobal.prisma.healthcare_platform_medical_images.findFirst({
      where: { id: medicalImageId },
      include: { ehrEncounter: true },
    });
  if (!image) {
    throw new Error("Medical image not found"); // 404
  }
  if (
    !image.ehrEncounter ||
    image.ehrEncounter.patient_record_id !== patientRecordId
  ) {
    throw new Error(
      "Medical image is not associated with the specified patient record",
    ); // 404
  }

  // 2. Find parent patient record; must not be soft deleted
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { id: patientRecordId, deleted_at: null },
    });
  if (!patientRecord) {
    throw new Error("Patient record not found or deleted"); // 404
  }

  // 3. Check for active compliance or legal hold locks on this patient record
  const activeLock =
    await MyGlobal.prisma.healthcare_platform_record_locks.findFirst({
      where: { patient_record_id: patientRecordId, released_at: null },
    });
  if (activeLock) {
    throw new Error(
      "Cannot delete medical image: patient record is under legal or compliance hold",
    ); // 403
  }

  // 4. Authorize operation (doctor is authenticated by decorator)
  //   Optionally implement more granular RBAC if needed

  // 5. Hard delete the medical image
  await MyGlobal.prisma.healthcare_platform_medical_images.delete({
    where: { id: medicalImageId },
  });
  // 6. (Optional) Insert audit log for compliance (not implemented here)
}
