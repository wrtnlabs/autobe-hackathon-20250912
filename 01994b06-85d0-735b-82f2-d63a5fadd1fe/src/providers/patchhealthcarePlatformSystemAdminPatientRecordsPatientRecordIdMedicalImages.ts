import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformMedicalImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformMedicalImage";
import { IPageIHealthcarePlatformMedicalImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformMedicalImage";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Search and retrieve a paginated, filtered list of medical image metadata for
 * a patient's record (healthcare_platform_medical_images table).
 *
 * This endpoint enables system administrators to search, page, and review
 * metadata (not image data) for all clinical images associated with a patient
 * record. It supports advanced filtering and sorting options and returns
 * paginated results. Only image metadata and file links are returned; not the
 * images themselves.
 *
 * Authorization is required: the caller must be a valid SystemadminPayload.
 * Patient record existence is enforced. All accesses may be logged for
 * compliance.
 *
 * @param props - SystemAdmin: Authenticated system administrator payload
 *   patientRecordId: The UUID of the patient record whose medical images are
 *   being queried body: Search/filter/sort/pagination parameters
 * @returns Paginated list of matching medical image metadata according to
 *   search criteria
 * @throws {Error} If the specified patient record does not exist or cannot be
 *   found
 */
export async function patchhealthcarePlatformSystemAdminPatientRecordsPatientRecordIdMedicalImages(props: {
  systemAdmin: SystemadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformMedicalImage.IRequest;
}): Promise<IPageIHealthcarePlatformMedicalImage> {
  const { systemAdmin, patientRecordId, body } = props;

  // Validate patient record exists
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { id: patientRecordId },
      select: { id: true },
    });
  if (!patientRecord) {
    throw new Error("Patient record not found");
  }

  // Find all EHR encounters for the patient
  const ehrEncounters =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findMany({
      where: { patient_record_id: patientRecordId },
      select: { id: true },
    });
  const encounterIds = ehrEncounters.map((enc) => enc.id);

  // Extract request parameters
  const {
    image_type,
    uploaded_by_user_id,
    ehr_encounter_id,
    created_from,
    created_to,
    page,
    limit,
    sort,
  } = body ?? {};

  // Pagination
  const pageNum = page ?? 1;
  const pageSize = limit ?? 20;
  const skip = (pageNum - 1) * pageSize;

  // Compose where clause for images
  const where = {
    // When ehr_encounter_id provided, filter single encounter, else filter for all belonging to the patient
    ...(ehr_encounter_id
      ? { ehr_encounter_id }
      : encounterIds.length > 0
        ? { ehr_encounter_id: { in: encounterIds } }
        : { ehr_encounter_id: "__never__" }), // Ensure no results for empty encounter set
    ...(image_type !== undefined && image_type !== null && { image_type }),
    ...(uploaded_by_user_id !== undefined &&
      uploaded_by_user_id !== null && {
        uploaded_by_user_id,
      }),
    ...(created_from !== undefined || created_to !== undefined
      ? {
          created_at: {
            ...(created_from !== undefined &&
              created_from !== null && {
                gte: created_from,
              }),
            ...(created_to !== undefined &&
              created_to !== null && {
                lte: created_to,
              }),
          },
        }
      : {}),
  };

  // Compose orderBy
  const defaultOrderBy = { created_at: "desc" as const };
  let orderBy;
  if (sort && typeof sort === "string") {
    const [field, directionRaw] = sort.trim().split(/\s+/);
    const direction =
      directionRaw && directionRaw.toLowerCase() === "asc"
        ? "asc"
        : directionRaw && directionRaw.toLowerCase() === "desc"
          ? "desc"
          : "desc";
    orderBy = { [field]: direction };
  } else {
    orderBy = defaultOrderBy;
  }

  // Run queries in parallel: data and count
  const [images, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_medical_images.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
    }),
    MyGlobal.prisma.healthcare_platform_medical_images.count({
      where,
    }),
  ]);

  // Map images to IHealthcarePlatformMedicalImage[]
  const data: IHealthcarePlatformMedicalImage[] = images.map((img) => {
    // Format created_at as ISO string
    // image_metadata_json: optional and nullable
    const image_metadata_json =
      typeof img.image_metadata_json === "string"
        ? img.image_metadata_json
        : img.image_metadata_json === null
          ? null
          : undefined;
    return {
      id: img.id,
      ehr_encounter_id: img.ehr_encounter_id,
      uploaded_by_user_id: img.uploaded_by_user_id,
      image_type: img.image_type,
      image_uri: img.image_uri,
      image_metadata_json,
      created_at: toISOStringSafe(img.created_at),
    };
  });

  // Result pagination structure
  return {
    pagination: {
      current: Number(pageNum),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / (pageSize || 1)),
    },
    data,
  };
}
