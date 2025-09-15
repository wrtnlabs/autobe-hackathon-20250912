import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import { IPageIHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformLabResult";
import { NursePayload } from "../decorators/payload/NursePayload";

/**
 * Search and retrieve paginated laboratory results for a specific encounter and
 * patient record
 *
 * This operation allows authorized nurses to search for and retrieve a
 * paginated list of laboratory results associated with a specific patient
 * record and EHR encounter. Filtering, sorting, and pagination follow the
 * platform's schema and security conventions. Lab results are returned in
 * summary format, excluding raw measurement.
 *
 * - The nurse making this request must have valid authentication and appropriate
 *   assignments (handled upstream).
 * - Both patientRecordId and encounterId are required and must match for results
 *   to be returned.
 * - Additional filters include lab_integration_id, test_name (partial match),
 *   result_flag, status, and datetime ranges on resulted_at and created_at.
 *   Sorting is allowed on resulted_at, test_name, result_flag, status; default
 *   is resulted_at desc.
 * - Pagination is supported via page/pageSize fields, both defaulting to
 *   reasonable values if missing.
 *
 * @param props - Request properties
 * @param props.nurse - Authenticated nurse payload
 * @param props.patientRecordId - The unique identifier of the patient record
 *   for which to retrieve lab results
 * @param props.encounterId - The unique identifier of the EHR encounter linked
 *   to the requested lab results
 * @param props.body - Search criteria, pagination, and filter options for lab
 *   result retrieval
 * @returns Paginated list of summarized lab result information matching
 *   provided filters and search options
 * @throws {Error} Throws when Prisma/database errors are encountered
 */
export async function patchhealthcarePlatformNursePatientRecordsPatientRecordIdEncountersEncounterIdLabResults(props: {
  nurse: NursePayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformLabResult.IRequest;
}): Promise<IPageIHealthcarePlatformLabResult.ISummary> {
  const { nurse, patientRecordId, encounterId, body } = props;

  // Pagination (defaults)
  const pageValue =
    body.page !== undefined && body.page !== null && body.page > 0
      ? body.page
      : 1;
  const pageSizeValue =
    body.pageSize !== undefined && body.pageSize !== null && body.pageSize > 0
      ? body.pageSize
      : 20;
  const page = Number(pageValue);
  const pageSize = Number(pageSizeValue);

  // WHERE clause
  const where = {
    patient_record_id: patientRecordId,
    ehr_encounter_id: encounterId,
    ...(body.lab_integration_id !== undefined &&
      body.lab_integration_id !== null && {
        lab_integration_id: body.lab_integration_id,
      }),
    ...(body.test_name !== undefined &&
      body.test_name !== null &&
      body.test_name.length > 0 && {
        test_name: {
          contains: body.test_name,
        },
      }),
    ...(body.result_flag !== undefined &&
      body.result_flag !== null && {
        result_flag: body.result_flag,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(((body.resulted_at_from !== undefined &&
      body.resulted_at_from !== null) ||
      (body.resulted_at_to !== undefined && body.resulted_at_to !== null)) && {
      resulted_at: {
        ...(body.resulted_at_from !== undefined &&
          body.resulted_at_from !== null && {
            gte: body.resulted_at_from,
          }),
        ...(body.resulted_at_to !== undefined &&
          body.resulted_at_to !== null && {
            lte: body.resulted_at_to,
          }),
      },
    }),
    ...(((body.created_at_from !== undefined &&
      body.created_at_from !== null) ||
      (body.created_at_to !== undefined && body.created_at_to !== null)) && {
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
    }),
  };

  // Allowed sort fields
  const allowedSortFields = [
    "resulted_at",
    "test_name",
    "result_flag",
    "status",
  ] as const;
  let orderBy: Record<string, "asc" | "desc"> = { resulted_at: "desc" };
  if (body.sort !== undefined && body.sort !== null) {
    const raw = body.sort.trim();
    if (raw.length > 0) {
      const [fieldRaw, dirRaw] = raw.split(" ", 2);
      const field = fieldRaw as (typeof allowedSortFields)[number];
      let dir: "asc" | "desc" = "desc";
      if (dirRaw !== undefined && dirRaw.toLowerCase() === "asc") dir = "asc";
      if (allowedSortFields.includes(field)) {
        orderBy = { [field]: dir };
      }
    }
  }

  // Query database
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_lab_results.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        ehr_encounter_id: true,
        test_name: true,
        result_flag: true,
        resulted_at: true,
        status: true,
      },
    }),
    MyGlobal.prisma.healthcare_platform_lab_results.count({ where }),
  ]);

  const data: IHealthcarePlatformLabResult.ISummary[] = rows.map((row) => ({
    id: row.id,
    ehr_encounter_id: row.ehr_encounter_id,
    test_name: row.test_name,
    result_flag: row.result_flag,
    resulted_at: toISOStringSafe(row.resulted_at),
    status: row.status,
  }));

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: pageSize as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / pageSize) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
