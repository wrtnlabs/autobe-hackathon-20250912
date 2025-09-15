import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import { IPageIHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformLabResult";
import { TechnicianPayload } from "../decorators/payload/TechnicianPayload";

/**
 * Search and retrieve paginated laboratory results for a specific encounter and
 * patient record.
 *
 * This operation fetches a filtered, paginated list of laboratory results
 * associated with the specified patient record and EHR encounter. Filters may
 * be applied through the request body, and results are returned in summary
 * format for list displays and navigation.
 *
 * @param props - Request properties
 * @param props.technician - The authenticated technician performing this
 *   operation
 * @param props.patientRecordId - The patient record UUID
 * @param props.encounterId - The EHR encounter UUID
 * @param props.body - Filter, search, and pagination parameters defined by
 *   IHealthcarePlatformLabResult.IRequest
 * @returns Summary page of laboratory results and pagination information
 * @throws {Error} If the encounter does not belong to the patient, does not
 *   exist, or is finalized/completed
 */
export async function patchhealthcarePlatformTechnicianPatientRecordsPatientRecordIdEncountersEncounterIdLabResults(props: {
  technician: TechnicianPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformLabResult.IRequest;
}): Promise<IPageIHealthcarePlatformLabResult.ISummary> {
  // 1. Validate encounter ownership and status
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findUnique({
      where: { id: props.encounterId },
      select: { id: true, patient_record_id: true, status: true },
    });
  if (!encounter || encounter.patient_record_id !== props.patientRecordId) {
    throw new Error("Encounter does not belong to given patient record");
  }
  if (encounter.status === "completed") {
    throw new Error("Lab result query forbidden: encounter is finalized");
  }
  // 2. Apply filters from request body
  const b = props.body;
  const where = {
    ehr_encounter_id: props.encounterId,
    ...(b.lab_integration_id != null &&
      b.lab_integration_id !== undefined && {
        lab_integration_id: b.lab_integration_id,
      }),
    ...(b.test_name != null &&
      b.test_name !== undefined && { test_name: { contains: b.test_name } }),
    ...(b.result_flag != null &&
      b.result_flag !== undefined && { result_flag: b.result_flag }),
    ...(b.status != null && b.status !== undefined && { status: b.status }),
    ...((b.resulted_at_from != null && b.resulted_at_from !== undefined) ||
    (b.resulted_at_to != null && b.resulted_at_to !== undefined)
      ? {
          resulted_at: {
            ...(b.resulted_at_from != null &&
              b.resulted_at_from !== undefined && { gte: b.resulted_at_from }),
            ...(b.resulted_at_to != null &&
              b.resulted_at_to !== undefined && { lte: b.resulted_at_to }),
          },
        }
      : {}),
    ...((b.created_at_from != null && b.created_at_from !== undefined) ||
    (b.created_at_to != null && b.created_at_to !== undefined)
      ? {
          created_at: {
            ...(b.created_at_from != null &&
              b.created_at_from !== undefined && { gte: b.created_at_from }),
            ...(b.created_at_to != null &&
              b.created_at_to !== undefined && { lte: b.created_at_to }),
          },
        }
      : {}),
  };
  // 3. Pagination calculation (brand removal for arithmetic)
  const page = b.page ?? 1;
  const pageSize = b.pageSize ?? 100;
  const skip = (Number(page) - 1) * Number(pageSize);
  // 4. Sorting
  let orderBy = { resulted_at: "desc" as const };
  if (b.sort) {
    const parts = b.sort.trim().split(/\s+/);
    if (parts.length >= 1) {
      const field = parts[0];
      const dir = (parts[1] ?? "").toLowerCase();
      const allowedFields = [
        "resulted_at",
        "test_name",
        "result_flag",
        "status",
      ];
      const allowedDirs = ["asc", "desc"];
      if (allowedFields.includes(field) && allowedDirs.includes(dir)) {
        orderBy = { [field]: dir } as Record<string, "asc" | "desc">;
      }
    }
  }
  // 5. Query data
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_lab_results.findMany({
      where,
      orderBy,
      skip: Number(skip),
      take: Number(pageSize),
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
  // 6. Mapping/pruning data for ISummary
  return {
    pagination: {
      current: Number(page) as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: Number(pageSize) as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: Number(total) as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(Number(total) / Number(pageSize)) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: rows.map((row) => ({
      id: row.id,
      ehr_encounter_id: row.ehr_encounter_id,
      test_name: row.test_name,
      result_flag: row.result_flag,
      resulted_at: toISOStringSafe(row.resulted_at),
      status: row.status,
    })),
  };
}
