import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEhrVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrVersion";
import { IPageIHealthcarePlatformEhrVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEhrVersion";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * List/filter all EHR version snapshots for a patient encounter with paging and
 * access control.
 *
 * This endpoint allows a secure, paginated, and filterable listing of all EHR
 * version snapshots associated with a particular patient's clinical encounter.
 * Only authorized nurses assigned to the patient record/encounter are permitted
 * access; query results are limited to those records.
 *
 * Filtering supports submitted_by_user_id, version_number, created_at range,
 * and reason_for_update, as well as pagination and sorting by allowed fields.
 * Business logic enforces that patientRecordId and encounterId must be
 * associated. Unauthorized or out-of-scope access throws an error.
 *
 * @param props - Props bundle
 * @param props.nurse - The nurse making the request (authorization context)
 * @param props.patientRecordId - The patient's unique record identifier (UUID)
 * @param props.encounterId - The EHR encounter's unique identifier (UUID)
 * @param props.body - Filtering/pagination/sorting options
 *   (IHealthcarePlatformEhrVersion.IRequest)
 * @returns Paginated page of EHR version snapshots for the specified encounter
 * @throws {Error} If the patient record does not own the encounter, or access
 *   is unauthorized
 */
export async function patchhealthcarePlatformNursePatientRecordsPatientRecordIdEncountersEncounterIdEhrVersions(props: {
  nurse: NursePayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformEhrVersion.IRequest;
}): Promise<IPageIHealthcarePlatformEhrVersion> {
  const { nurse, patientRecordId, encounterId, body } = props;
  // Step 1: Verify the encounter belongs to the patient record (authorization guard)
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: encounterId,
        patient_record_id: patientRecordId,
      },
    });
  if (!encounter) {
    throw new Error("Encounter not found or does not belong to patient record");
  }

  // Step 2: Build dynamic filter conditions for versions
  const versionWhere = {
    ehr_encounter_id: encounterId,
    ...(body.submitted_by_user_id !== undefined &&
      body.submitted_by_user_id !== null && {
        submitted_by_user_id: body.submitted_by_user_id,
      }),
    ...(body.version_number !== undefined &&
      body.version_number !== null && {
        version_number: body.version_number,
      }),
    ...(body.reason_for_update !== undefined &&
      body.reason_for_update !== null && {
        reason_for_update: body.reason_for_update,
      }),
    ...((body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
      ? {
          created_at: {
            ...(body.created_at_from !== undefined &&
              body.created_at_from !== null && { gte: body.created_at_from }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && { lte: body.created_at_to }),
          },
        }
      : {}),
  };

  // Step 3: Sorting & pagination with defensive field narrowing
  const allowedSortFields = ["created_at", "version_number"];
  const sortField = allowedSortFields.includes(body.sort ?? "created_at")
    ? (body.sort ?? "created_at")
    : "created_at";
  const sortOrder =
    body.order === "asc" || body.order === "desc" ? body.order : "desc";
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Step 4: Query results and count for pagination
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_ehr_versions.findMany({
      where: versionWhere,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_ehr_versions.count({
      where: versionWhere,
    }),
  ]);

  // Step 5: Map rows to API response DTO format and normalize dates/branding
  const data = rows.map((row) => ({
    id: row.id,
    ehr_encounter_id: row.ehr_encounter_id,
    submitted_by_user_id: row.submitted_by_user_id,
    version_number: row.version_number,
    snapshot_json: row.snapshot_json,
    reason_for_update: row.reason_for_update ?? null,
    created_at: toISOStringSafe(row.created_at),
  }));

  // Step 6: Return pagination wrapper with records
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / (limit > 0 ? limit : 1)),
    },
    data,
  };
}
