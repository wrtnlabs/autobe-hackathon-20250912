import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformVital";
import { IPageIHealthcarePlatformVital } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformVital";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Retrieves a filtered and paginated list of patient vital sign entries for a
 * clinical encounter.
 *
 * This endpoint allows department heads to search, filter, and analyze vital
 * sign entries recorded by clinical staff (nurse, medical doctor, etc.) for a
 * given patient and encounter. Supports advanced querying by vital type, value
 * range, measurement timestamp, recording user, units, sorting, and pagination.
 * Ensures encounter belongs to the correct patient record and returns a fully
 * structured paginated vital list with strict type and date handling.
 *
 * @param props - Request context and search parameters
 * @param props.departmentHead - The authenticated Department Head user
 * @param props.patientRecordId - The patient record UUID to filter
 * @param props.encounterId - The EHR encounter UUID to filter
 * @param props.body - Search, filter, and pagination details
 *   (IHealthcarePlatformVital.IRequest)
 * @returns Paginated list of vitals for the encounter, matching the API
 *   contract
 * @throws {Error} If the encounter does not exist for the given patient record
 */
export async function patchhealthcarePlatformDepartmentHeadPatientRecordsPatientRecordIdEncountersEncounterIdVitals(props: {
  departmentHead: DepartmentheadPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformVital.IRequest;
}): Promise<IPageIHealthcarePlatformVital> {
  const { departmentHead, patientRecordId, encounterId, body } = props;

  // Step 1: Verify the encounter exists and is associated with the patient record
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findFirst({
      where: {
        id: encounterId,
        patient_record_id: patientRecordId,
      },
      select: { id: true },
    });
  if (!encounter) throw new Error("Not found: Encounter for patient record");

  // Step 2: Build where filter for vitals
  const where: Record<string, unknown> = {
    ehr_encounter_id: encounterId,
    // vital_type: optional
    ...(body.vital_type !== undefined &&
      body.vital_type !== null && { vital_type: body.vital_type }),
    // value_min/value_max: range
    ...(body.value_min !== undefined || body.value_max !== undefined
      ? {
          vital_value: {
            ...(body.value_min !== undefined && { gte: body.value_min }),
            ...(body.value_max !== undefined && { lte: body.value_max }),
          },
        }
      : {}),
    // measured_after/measured_before: range
    ...(body.measured_after !== undefined || body.measured_before !== undefined
      ? {
          measured_at: {
            ...(body.measured_after !== undefined && {
              gte: body.measured_after,
            }),
            ...(body.measured_before !== undefined && {
              lte: body.measured_before,
            }),
          },
        }
      : {}),
    // recorded_by_user_id: optional
    ...(body.recorded_by_user_id !== undefined &&
      body.recorded_by_user_id !== null && {
        recorded_by_user_id: body.recorded_by_user_id,
      }),
    // unit: optional
    ...(body.unit !== undefined && body.unit !== null && { unit: body.unit }),
  };

  // Step 3: Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Step 4: Sorting
  const allowedSortFields = ["measured_at", "vital_value"] as const;
  const sort_by =
    body.sort_by &&
    allowedSortFields.includes(
      body.sort_by as (typeof allowedSortFields)[number],
    )
      ? body.sort_by
      : "measured_at";
  const sort_order =
    body.sort_order === "asc" || body.sort_order === "desc"
      ? body.sort_order
      : "desc";

  // Step 5: Query vitals and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_vitals.findMany({
      where,
      orderBy: { [sort_by]: sort_order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.healthcare_platform_vitals.count({ where }),
  ]);

  // Step 6: Map to API DTO, converting all Date types to string & tags.Format<'date-time'>
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      ehr_encounter_id: row.ehr_encounter_id,
      recorded_by_user_id: row.recorded_by_user_id,
      vital_type: row.vital_type,
      vital_value: row.vital_value,
      unit: row.unit,
      measured_at: toISOStringSafe(row.measured_at),
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
