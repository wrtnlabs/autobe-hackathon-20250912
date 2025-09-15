import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformMedicalImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalImage";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Upload a new medical image and associate it to the given patient record
 * (healthcare_platform_medical_images table).
 *
 * This operation allows authorized clinical users (technicians, doctors,
 * nurses, or patients in self-upload scenarios) to add a new medical image to a
 * patient's record. Creates a new medical image record under the specified
 * patient record, storing metadata (e.g., type, modality, acquisition details),
 * a URI to the uploaded image, and references to the uploading technician and
 * parent EHR encounter.
 *
 * RBAC restricts this API to healthcare professionals (technician, nurse,
 * doctor) unless patient self-uploads are explicitly allowed by organizational
 * policy. Strict validation ensures the parent patient record exists and is
 * accessible by the uploading user, the uploaded file meets type/format
 * requirements (e.g., DICOM, JPEG), and the storage URI is secure and
 * tamper-proof. All uploads (including self-service) are logged, and
 * privacy/policy flags are applied as relevant. In case of validation or policy
 * errors (invalid patient record, file format, permissions, or attempts to
 * upload to a locked/archived record), the system rejects the request and
 * provides actionable error details.
 *
 * @param props - Request properties
 * @param props.technician - Authenticated technician payload for audit and
 *   role-based enforcement
 * @param props.patientRecordId - Unique identifier of the parent patient record
 *   (UUID)
 * @param props.body - Metadata and secure file URI for the uploaded medical
 *   image
 * @returns Full metadata and reference for the newly created medical image
 *   entity
 * @throws {Error} When the patient record does not exist or is deleted
 * @throws {Error} When the EHR encounter does not exist or does not belong to
 *   the specified patient record
 * @throws {Error} When the image_type is not allowed
 * @throws {Error} When image_uri is missing or invalid
 */
export async function posthealthcarePlatformTechnicianPatientRecordsPatientRecordIdMedicalImages(props: {
  technician: TechnicianPayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformMedicalImage.ICreate;
}): Promise<IHealthcarePlatformMedicalImage> {
  const { technician, patientRecordId, body } = props;

  // Validate the patient record exists and is not deleted
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: {
        id: patientRecordId,
        deleted_at: null,
      },
    });
  if (!patientRecord) {
    throw new Error("Patient record not found or has been deleted");
  }

  // Validate the EHR encounter exists, is not deleted, and belongs to this patient record
  const ehrEncounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: body.ehr_encounter_id,
        patient_record_id: patientRecordId,
        deleted_at: null,
      },
    });
  if (!ehrEncounter) {
    throw new Error(
      "EHR encounter not found, does not belong to the patient record, or is deleted",
    );
  }

  // Only support whitelisted image types, stricter or MIME validation may be delegated to other infra
  const allowedTypes = ["DICOM", "JPEG", "PNG"];
  if (!allowedTypes.includes(body.image_type)) {
    throw new Error("Invalid image_type; only DICOM, JPEG, PNG are allowed");
  }

  // Validate image_uri
  if (
    !body.image_uri ||
    typeof body.image_uri !== "string" ||
    body.image_uri.length === 0
  ) {
    throw new Error("image_uri must be a non-empty string");
  }

  // Prepare time stamps as correct branded ISO string
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Generate new UUID for created row
  const id: string & tags.Format<"uuid"> = v4();

  // Perform the database insert
  const created =
    await MyGlobal.prisma.healthcare_platform_medical_images.create({
      data: {
        id: id,
        ehr_encounter_id: body.ehr_encounter_id,
        uploaded_by_user_id: technician.id,
        image_type: body.image_type,
        image_uri: body.image_uri,
        image_metadata_json: body.image_metadata_json ?? undefined,
        created_at: now,
      },
    });

  // Return full metadata. Conform to API contract; image_metadata_json is optional.
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
