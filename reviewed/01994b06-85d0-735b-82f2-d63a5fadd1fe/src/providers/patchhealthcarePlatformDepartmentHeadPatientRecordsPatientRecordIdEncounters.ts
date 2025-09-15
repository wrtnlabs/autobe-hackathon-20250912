import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformEhrEncounter";
import { IPageIHealthcarePlatformEhrEncounter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformEhrEncounter";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Search and retrieve a paginated, filterable list of patient encounters.
 *
 * This endpoint allows a department head to retrieve all EHR encounter
 * summaries for a specific patient record, supporting filtering by type,
 * provider, status, and time window. Only encounters for patient records in the
 * department head's department may be accessed. Supports pagination and robust
 * business-compliant filtering and audit logic.
 *
 * RBAC: Department head may only access patient encounters for patient records
 * in their own department.
 *
 * @param props - Operation parameters
 * @param props.departmentHead - The authenticated department head's payload
 * @param props.patientRecordId - UUID of the patient record
 * @param props.body - Search, filter, and pagination criteria
 * @returns Paginated encounter summaries matching the filter
 * @throws {Error} If the department head is not authorized, or parameters are
 *   invalid
 */
export async function patchhealthcarePlatformDepartmentHeadPatientRecordsPatientRecordIdEncounters(props: {
  departmentHead: DepartmentheadPayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformEhrEncounter.IRequest;
}): Promise<IPageIHealthcarePlatformEhrEncounter.ISummary> {
  // 1. Authorize that this patient record is in the department head's department
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findUnique({
      where: { id: props.patientRecordId },
      select: { department_id: true },
    });
  if (!patientRecord) throw new Error("Patient record not found");
  // DepartmentheadPayload must supply department_id (logic enforced at join)
  if (
    !patientRecord.department_id ||
    patientRecord.department_id !== (props.departmentHead as any).department_id
  ) {
    throw new Error(
      "Forbidden: You may only view encounters for your own department's patient records",
    );
  }

  // 2. Prepare dynamic where clause for pagination and advanced filtering
  const where: Record<string, unknown> = {
    patient_record_id: props.patientRecordId,
    deleted_at: null,
    ...(props.body.encounter_type && {
      encounter_type: { in: props.body.encounter_type },
    }),
    ...(props.body.provider_user_ids && {
      provider_user_id: { in: props.body.provider_user_ids },
    }),
    ...(props.body.status && {
      status: { in: props.body.status },
    }),
    ...((props.body.encounter_start_at_from ||
      props.body.encounter_start_at_to) && {
      encounter_start_at: {
        ...(props.body.encounter_start_at_from && {
          gte: props.body.encounter_start_at_from,
        }),
        ...(props.body.encounter_start_at_to && {
          lte: props.body.encounter_start_at_to,
        }),
      },
    }),
    ...(props.body.notes_query && {
      notes: { contains: props.body.notes_query },
    }),
  };

  // 3. Handle pagination variables
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 4. Validate and construct safe sort fields
  const allowedSortFields = [
    "encounter_start_at",
    "encounter_type",
    "status",
    "provider_user_id",
  ];
  const sort_by =
    props.body.sort_by && allowedSortFields.includes(props.body.sort_by)
      ? props.body.sort_by
      : "encounter_start_at";
  const sort_direction = props.body.sort_direction === "asc" ? "asc" : "desc";

  // 5. Fetch data and total concurrently
  const [encounters, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_ehr_encounters.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sort_by]: sort_direction },
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

  // 6. Map and format results for summary
  const data: IHealthcarePlatformEhrEncounter.ISummary[] = encounters.map(
    (row) => ({
      id: row.id,
      patient_record_id: row.patient_record_id,
      provider_user_id: row.provider_user_id,
      encounter_type: row.encounter_type,
      encounter_start_at: toISOStringSafe(row.encounter_start_at),
      ...(row.encounter_end_at
        ? { encounter_end_at: toISOStringSafe(row.encounter_end_at) }
        : {}),
      status: row.status,
    }),
  );

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
