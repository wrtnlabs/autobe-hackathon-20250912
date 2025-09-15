import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEhrVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrVersion";
import { IPageIHealthcarePlatformEhrVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEhrVersion";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * List/filter all EHR version snapshots for a patient encounter with paging and
 * access control.
 *
 * This endpoint provides a paginated, filterable list of immutable EHR version
 * records for a specific clinical encounter (by encounterId) belonging to the
 * given patient record. Only system admins with proper scope can view records.
 * Result includes pagination.
 *
 * @param props - Method parameters
 * @param props.systemAdmin - The authenticated SystemadminPayload for access
 *   control.
 * @param props.patientRecordId - UUID of the patient's
 *   healthcare_platform_patient_records record
 * @param props.encounterId - UUID of the healthcare_platform_ehr_encounters
 *   record
 * @param props.body - Query, filtering, and pagination criteria for listing EHR
 *   versions
 * @returns Paginated EHR version records matching criteria, with compliant
 *   field types.
 */
export async function patchhealthcarePlatformSystemAdminPatientRecordsPatientRecordIdEncountersEncounterIdEhrVersions(props: {
  systemAdmin: SystemadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformEhrVersion.IRequest;
}): Promise<IPageIHealthcarePlatformEhrVersion> {
  const { systemAdmin, patientRecordId, encounterId, body } = props;

  // Step 1: Confirm that encounter belongs to patientRecordId
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: encounterId,
        patient_record_id: patientRecordId,
      },
      select: {
        id: true,
        patient_record_id: true,
      },
    });
  if (!encounter) {
    // Return empty page if not found or scope violation (as per compliance rules)
    return {
      pagination: {
        current: Number(body.page ?? 1),
        limit: Number(body.limit ?? 20),
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }

  // Step 2: Build filter where clause
  const whereClause: Record<string, unknown> = {
    ehr_encounter_id: encounterId,
  };
  if (
    body.submitted_by_user_id !== undefined &&
    body.submitted_by_user_id !== null
  ) {
    whereClause.submitted_by_user_id = body.submitted_by_user_id;
  }
  if (body.version_number !== undefined && body.version_number !== null) {
    whereClause.version_number = body.version_number;
  }
  if (body.reason_for_update !== undefined && body.reason_for_update !== null) {
    whereClause.reason_for_update = body.reason_for_update;
  }
  if (
    (body.created_at_from !== undefined && body.created_at_from !== null) ||
    (body.created_at_to !== undefined && body.created_at_to !== null)
  ) {
    whereClause.created_at = {
      ...(body.created_at_from !== undefined &&
        body.created_at_from !== null && { gte: body.created_at_from }),
      ...(body.created_at_to !== undefined &&
        body.created_at_to !== null && { lte: body.created_at_to }),
    };
  }

  // Step 3: Pagination and sorting
  const pageNum = Number(body.page ?? 1);
  const limitNum = Number(body.limit ?? 20);
  const skip = (pageNum - 1) * limitNum;

  // Inline orderBy to ensure correct Prisma inference
  // If sort is not given, default to created_at desc
  // If sort is present, only allow permitted fields to prevent dynamic injection (extra safety)
  const allowedSortFields = [
    "created_at",
    "version_number",
    "submitted_by_user_id",
  ];
  // Determine orderBy logic strictly inline
  const orderByField =
    body.sort && allowedSortFields.includes(body.sort.replace(/^[-+]/, ""))
      ? (body.sort.replace(/^[-+]/, "") as
          | "created_at"
          | "version_number"
          | "submitted_by_user_id")
      : "created_at";
  const orderDir = body.order === "asc" ? ("asc" as const) : ("desc" as const);

  // Step 4: Fetch and map results
  const [items, totalCount] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_ehr_versions.findMany({
      where: whereClause,
      orderBy: [
        {
          [orderByField]: orderDir,
        } as {
          [key in typeof orderByField]: "asc" | "desc";
        },
      ],
      skip,
      take: limitNum,
    }),
    MyGlobal.prisma.healthcare_platform_ehr_versions.count({
      where: whereClause,
    }),
  ]);
  const data: IHealthcarePlatformEhrVersion[] = items.map((item) => ({
    id: item.id,
    ehr_encounter_id: item.ehr_encounter_id,
    submitted_by_user_id: item.submitted_by_user_id,
    version_number: item.version_number,
    snapshot_json: item.snapshot_json,
    reason_for_update: item.reason_for_update ?? null,
    created_at: toISOStringSafe(item.created_at),
  }));
  const pagination = {
    current: Number(pageNum),
    limit: Number(limitNum),
    records: totalCount,
    pages: Math.ceil(totalCount / limitNum),
  };
  return { pagination, data };
}
