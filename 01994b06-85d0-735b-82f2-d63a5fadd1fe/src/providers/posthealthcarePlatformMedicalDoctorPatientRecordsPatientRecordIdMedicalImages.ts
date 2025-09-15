import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformMedicalImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalImage";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * Upload a new medical image and associate it to the given patient record
 * (healthcare_platform_medical_images table).
 *
 * This operation allows authorized clinical users (technicians, doctors,
 * nurses, or patients in self-upload scenarios) to add a new medical image to a
 * patient's record. It verifies existence and linkage of the patient record and
 * EHR encounter, enforces RBAC for medical doctors (uploader must be the
 * assigned provider for the encounter), and inserts a new medical image record.
 * All fields are strictly typed, dates use ISO-8601, and no type assertions or
 * native Date are used anywhere.
 *
 * @param props - Function arguments
 * @param props.medicalDoctor - Authenticated medical doctor uploading the image
 * @param props.patientRecordId - Target patient record UUID
 * @param props.body - Metadata for the image (must include encounter, uploader,
 *   type, URI, etc.)
 * @returns The full metadata for the new image as
 *   IHealthcarePlatformMedicalImage
 * @throws {Error} If patient record, encounter, or doctor linkage is invalid,
 *   or RBAC fails
 */
export async function posthealthcarePlatformMedicalDoctorPatientRecordsPatientRecordIdMedicalImages(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformMedicalImage.ICreate;
}): Promise<IHealthcarePlatformMedicalImage> {
  const { medicalDoctor, patientRecordId, body } = props;

  // Validation: Patient record must exist and not be soft deleted
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { id: patientRecordId, deleted_at: null },
    });
  if (patientRecord == null) {
    throw new Error("Patient record not found or deleted");
  }

  // Validation: Encounter must exist, be linked to patient, and not be soft deleted
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: body.ehr_encounter_id,
        patient_record_id: patientRecordId,
        deleted_at: null,
      },
    });
  if (encounter == null) {
    throw new Error(
      "EHR encounter not found, not linked to patient record, or deleted",
    );
  }

  // RBAC/Ownership: Doctor must be provider for this encounter
  if (encounter.provider_user_id !== medicalDoctor.id) {
    throw new Error(
      "Only the assigned provider doctor for this encounter can upload images",
    );
  }

  // RBAC: Uploader must be the logged-in doctor (prevent upload as someone else)
  if (body.uploaded_by_user_id !== medicalDoctor.id) {
    throw new Error("Uploader must match the logged-in medical doctor");
  }

  // Insert new medical image, strictly typed, using string & tags.Format<'date-time'> and generated UUID
  const created =
    await MyGlobal.prisma.healthcare_platform_medical_images.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        ehr_encounter_id: body.ehr_encounter_id,
        uploaded_by_user_id: body.uploaded_by_user_id,
        image_type: body.image_type,
        image_uri: body.image_uri,
        image_metadata_json: body.image_metadata_json ?? undefined,
        created_at: toISOStringSafe(new Date()),
      },
    });

  return {
    id: created.id,
    ehr_encounter_id: created.ehr_encounter_id,
    uploaded_by_user_id: created.uploaded_by_user_id,
    image_type: created.image_type,
    image_uri: created.image_uri,
    image_metadata_json: created.image_metadata_json ?? undefined,
    created_at: toISOStringSafe(created.created_at),
  };
}
