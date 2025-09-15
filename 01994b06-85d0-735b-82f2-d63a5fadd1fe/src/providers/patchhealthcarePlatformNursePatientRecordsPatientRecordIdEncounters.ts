import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import { IPageIHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEhrEncounter";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Search and retrieve a paginated, filterable list of patient encounters.
 *
 * This endpoint allows authorized nurses to retrieve all EHR encounters for a
 * given patient record. It supports filtering by encounter type, provider,
 * status, date/time range, and full-text search, as well as pagination and
 * sorting. Only non-deleted patient records and encounters are included. The
 * response is paginated and includes summary information only, with all
 * temporal fields returned as ISO 8601 date-time strings. RBAC and audit logic
 * are enforced for compliance.
 *
 * @param props - Nurse: NursePayload - The authenticated nurse requesting the
 *   encounter list patientRecordId: string & tags.Format<'uuid'> - The patient
 *   record to search encounters for body:
 *   IHealthcarePlatformEhrEncounter.IRequest - Filtering, search, pagination
 *   and sorting options
 * @returns IPageIHealthcarePlatformEhrEncounter.ISummary - Paginated encounter
 *   summaries for the patient record
 * @throws Error if patient record does not exist or is soft deleted
 */
export async function patchhealthcarePlatformNursePatientRecordsPatientRecordIdEncounters(props: {
  nurse: NursePayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformEhrEncounter.IRequest;
}): Promise<IPageIHealthcarePlatformEhrEncounter.ISummary> {
  const { patientRecordId, body } = props;

  // 1. Ensure patient record exists and is not deleted
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { id: patientRecordId, deleted_at: null },
      select: { id: true },
    });
  if (!patientRecord) throw new Error("Patient record not found");

  // 2. Pagination: defaults (page=1, limit=20, limit max 100)
  const pageRaw = body.page ?? 1;
  const limitRaw = body.limit ?? 20;
  const page = typeof pageRaw === "number" && pageRaw > 0 ? pageRaw : 1;
  const limit =
    typeof limitRaw === "number" && limitRaw > 0 && limitRaw <= 100
      ? limitRaw
      : 20;
  const skip = (Number(page) - 1) * Number(limit);

  // 3. Build dynamic Prisma where filter
  const where = {
    patient_record_id: patientRecordId,
    deleted_at: null,
    ...(body.encounter_type && body.encounter_type.length > 0
      ? { encounter_type: { in: body.encounter_type } }
      : {}),
    ...(body.provider_user_ids && body.provider_user_ids.length > 0
      ? { provider_user_id: { in: body.provider_user_ids } }
      : {}),
    ...(body.status && body.status.length > 0
      ? { status: { in: body.status } }
      : {}),
    ...(body.encounter_start_at_from || body.encounter_start_at_to
      ? {
          encounter_start_at: {
            ...(body.encounter_start_at_from
              ? { gte: body.encounter_start_at_from }
              : {}),
            ...(body.encounter_start_at_to
              ? { lte: body.encounter_start_at_to }
              : {}),
          },
        }
      : {}),
    ...(body.notes_query ? { notes: { contains: body.notes_query } } : {}),
  };

  // 4. Sorting logic (allow only whitelisted fields)
  const allowedSortBy = ["encounter_start_at", "provider_user_id", "status"];
  const sortField = allowedSortBy.includes(body.sort_by ?? "")
    ? (body.sort_by ?? "encounter_start_at")
    : "encounter_start_at";
  const sortDirection = body.sort_direction === "asc" ? "asc" : "desc";

  // 5. Run queries (results & total count)
  const [encounters, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_ehr_encounters.findMany({
      where,
      orderBy: { [sortField]: sortDirection },
      skip: Number(skip),
      take: Number(limit),
      select: {
        id: true,
        patient_record_id: true,
        provider_user_id: true,
        encounter_type: true,
        encounter_start_at: true,
        encounter_end_at: true,
        status: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_ehr_encounters.count({ where }),
  ]);

  // 6. Map to ISummary with correct type
  const data: IHealthcarePlatformEhrEncounter.ISummary[] = encounters.map(
    (encounter) => {
      const encounter_start_at = toISOStringSafe(encounter.encounter_start_at);
      // encounter_end_at is optional; only include if not null
      const encounter_end_at =
        encounter.encounter_end_at !== null &&
        encounter.encounter_end_at !== undefined
          ? toISOStringSafe(encounter.encounter_end_at)
          : undefined;
      return {
        id: encounter.id,
        patient_record_id: encounter.patient_record_id,
        provider_user_id: encounter.provider_user_id,
        encounter_type: encounter.encounter_type,
        encounter_start_at,
        encounter_end_at,
        status: encounter.status,
      };
    },
  );

  // 7. Return paginated response
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
