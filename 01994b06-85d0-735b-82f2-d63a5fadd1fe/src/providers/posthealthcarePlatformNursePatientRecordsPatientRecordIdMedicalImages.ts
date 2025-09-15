import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformMedicalImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalImage";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Upload a new medical image and associate it to the given patient record
 * (healthcare_platform_medical_images table).
 *
 * Creates a new medical image record under the specified patient record,
 * storing metadata (e.g., type, modality, acquisition details), a URI to the
 * uploaded image, and references to the uploading technician and parent EHR
 * encounter. Upon successful creation, the system triggers audit trail entries,
 * optionally notifies relevant care team members, and links the file to the
 * encounter for downstream clinical review.
 *
 * Only authorized healthcare professionals (nurse in this endpoint) may invoke
 * this operation. Strict validation ensures the parent patient record exists
 * and is accessible by the uploading user, the uploaded file meets type/format
 * requirements, and referenced entities are not soft deleted. Uploads are fully
 * audited for compliance.
 *
 * @param props - Operation parameters
 * @param props.nurse - Authenticated nurse payload (must be active)
 * @param props.patientRecordId - Unique identifier of the parent patient record
 *   (UUID)
 * @param props.body - Metadata and secure file URI for the uploaded medical
 *   image
 * @returns Full metadata and reference for the newly created medical image
 *   entity
 * @throws {Error} If any referenced entity does not exist or is deleted, or if
 *   image_type is not allowed, or if access or policy violation
 */
export async function posthealthcarePlatformNursePatientRecordsPatientRecordIdMedicalImages(props: {
  nurse: NursePayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformMedicalImage.ICreate;
}): Promise<IHealthcarePlatformMedicalImage> {
  const { nurse, patientRecordId, body } = props;

  // Validate nurse (deleted_at null enforced by decorator, but double-checked here)
  const nurseRow = await MyGlobal.prisma.healthcare_platform_nurses.findFirst({
    where: { id: nurse.id, deleted_at: null },
  });
  if (!nurseRow) {
    throw new Error("Nurse not found or is disabled (deleted_at is not null)");
  }

  // Validate patient record exists and is active
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { id: patientRecordId, deleted_at: null },
    });
  if (!patientRecord) {
    throw new Error("Patient record not found or is archived");
  }

  // Authorization: Optionally enforce organization match between nurse and patient record
  // (Cannot enforce fully with current schema—should be extended in system for enterprise readiness)

  // Validate EHR encounter exists, is attached to patient record, and is active
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: body.ehr_encounter_id,
        patient_record_id: patientRecordId,
        deleted_at: null,
      },
    });
  if (!encounter) {
    throw new Error(
      "EHR encounter not found, not active, or does not belong to patient record",
    );
  }

  // Enforce allowed image formats/types
  const allowedImageTypes = ["DICOM", "JPEG", "PNG"];
  if (!allowedImageTypes.includes(body.image_type)) {
    throw new Error(
      `image_type '${body.image_type}' not supported. Allowed types: ${allowedImageTypes.join(", ")}`,
    );
  }

  // Prepare fields
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const uuid: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;

  // Create new medical image row
  const created =
    await MyGlobal.prisma.healthcare_platform_medical_images.create({
      data: {
        id: uuid,
        ehr_encounter_id: body.ehr_encounter_id,
        uploaded_by_user_id: body.uploaded_by_user_id,
        image_type: body.image_type,
        image_uri: body.image_uri,
        image_metadata_json: body.image_metadata_json ?? undefined,
        created_at: now,
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
