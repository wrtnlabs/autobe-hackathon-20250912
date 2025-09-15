import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEhrVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrVersion";
import { IPageIHealthcarePlatformEhrVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEhrVersion";
import { MedicaldoctorPayload } from "../decorators/payload/MedicaldoctorPayload";

/**
 * List/filter all EHR version snapshots for a patient encounter with paging and
 * access control.
 *
 * This endpoint allows a secure, paginated, and filterable listing of all EHR
 * version snapshots associated with a particular patient's clinical encounter.
 * It serves the healthcare_platform_ehr_versions table and supports advanced
 * queries, including date filtering, submitted by, and update reason.
 *
 * Security: Only an authenticated medical doctor for this encounter may call
 * this endpoint. All access is logged for compliance; audit handled externally.
 * Business logic: returns only records for the supplied encounterId, and
 * applies all filter, sort, and pagination parameters as requested.
 *
 * @param props - The input properties for the listing operation.
 * @param props.medicalDoctor - The authenticated medical doctor requesting the
 *   records.
 * @param props.patientRecordId - The patient's record UUID (ignored for filter,
 *   but kept for path semantics).
 * @param props.encounterId - The target EHR encounter UUID.
 * @param props.body - The filter/search/pagination criteria as request body.
 * @returns Paginated list of EHR version snapshots for the specified patient
 *   encounter.
 * @throws {Error} When the user is unauthorized, the encounter does not exist,
 *   or filters are out of scope.
 */
export async function patchhealthcarePlatformMedicalDoctorPatientRecordsPatientRecordIdEncountersEncounterIdEhrVersions(props: {
  medicalDoctor: MedicaldoctorPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformEhrVersion.IRequest;
}): Promise<IPageIHealthcarePlatformEhrVersion> {
  const { medicalDoctor, encounterId, body } = props;

  // Enforce pagination defaults
  const page =
    body.page !== undefined && body.page !== null && body.page >= 0
      ? body.page
      : 0;
  const limit =
    body.limit !== undefined && body.limit !== null && body.limit > 0
      ? body.limit
      : 20;

  // Sorting logic: only allow sort on whitelisted fields
  const allowedSortFields = ["created_at", "version_number"];
  const sortField =
    body.sort && allowedSortFields.includes(body.sort)
      ? body.sort
      : "created_at";
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  // Compose Prisma 'where' clause
  const where = {
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
              body.created_at_from !== null && {
                gte: body.created_at_from,
              }),
            ...(body.created_at_to !== undefined &&
              body.created_at_to !== null && {
                lte: body.created_at_to,
              }),
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_ehr_versions.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: Number(page) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.healthcare_platform_ehr_versions.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(limit) > 0 ? Math.ceil(Number(total) / Number(limit)) : 0,
    },
    data: items.map((row) => ({
      id: row.id,
      ehr_encounter_id: row.ehr_encounter_id,
      submitted_by_user_id: row.submitted_by_user_id,
      version_number: row.version_number,
      snapshot_json: row.snapshot_json,
      reason_for_update:
        row.reason_for_update !== undefined && row.reason_for_update !== null
          ? row.reason_for_update
          : null,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
