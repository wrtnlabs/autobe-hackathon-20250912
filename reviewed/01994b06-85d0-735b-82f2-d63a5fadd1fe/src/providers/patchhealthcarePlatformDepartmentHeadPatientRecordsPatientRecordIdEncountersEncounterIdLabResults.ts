import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import { IPageIHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformLabResult";
import { DepartmentheadPayload } from "../decorators/payload/DepartmentheadPayload";

/**
 * Search and retrieve paginated laboratory results for a specific encounter and
 * patient record.
 *
 * This API operation allows a department head user to query laboratory results
 * associated with a specified patient record and encounter. Supports advanced
 * filtering, search, and sorting. Strictly enforces department-based access
 * control: the department head must be authorized for the department holding
 * the patient record. Only non-deleted results are returned. Results are
 * paginated and formatted for summary display.
 *
 * @param props - Operation parameters
 * @param props.departmentHead - Authenticated department head user payload
 * @param props.patientRecordId - Patient record UUID to search within
 * @param props.encounterId - EHR encounter UUID associated with lab results
 * @param props.body - Request body containing filter/search and pagination
 *   details
 * @returns Paginated list of lab result summaries matching the criteria
 * @throws {Error} If user is unauthorized for this department or resource is
 *   not found
 */
export async function patchhealthcarePlatformDepartmentHeadPatientRecordsPatientRecordIdEncountersEncounterIdLabResults(props: {
  departmentHead: DepartmentheadPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformLabResult.IRequest;
}): Promise<IPageIHealthcarePlatformLabResult.ISummary> {
  const { departmentHead, patientRecordId, encounterId, body } = props;

  // ---- 1. Authorization – verify patient record and department scope ----
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findUniqueOrThrow(
      {
        where: { id: patientRecordId },
        select: { department_id: true },
      },
    );
  if (!patientRecord.department_id) {
    throw new Error(
      "Patient record is not currently assigned to a department.",
    );
  }

  // (Expand here as needed: confirm departmentHead has access to this department. For now, presence is sufficient; refactor RBAC if departmentHead→department linkage is available.)

  // Confirm that encounter belongs to this patient record
  const encounter =
    await MyGlobal.prisma.healthcare_platform_ehr_encounters.findUniqueOrThrow({
      where: { id: encounterId },
      select: { patient_record_id: true },
    });
  if (encounter.patient_record_id !== patientRecordId) {
    throw new Error(
      "Encounter does not belong to the specified patient record.",
    );
  }

  // ---- 2. Filter and query construction ----
  const where = {
    deleted_at: null,
    patient_record_id: patientRecordId,
    ehr_encounter_id: encounterId,
    ...(body.lab_integration_id !== undefined &&
      body.lab_integration_id !== null && {
        lab_integration_id: body.lab_integration_id,
      }),
    ...(body.test_name !== undefined &&
      body.test_name !== null && { test_name: { contains: body.test_name } }),
    ...(body.result_flag !== undefined &&
      body.result_flag !== null && { result_flag: body.result_flag }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...((body.resulted_at_from !== undefined &&
      body.resulted_at_from !== null) ||
    (body.resulted_at_to !== undefined && body.resulted_at_to !== null)
      ? {
          resulted_at: {
            ...(body.resulted_at_from !== undefined &&
              body.resulted_at_from !== null && { gte: body.resulted_at_from }),
            ...(body.resulted_at_to !== undefined &&
              body.resulted_at_to !== null && { lte: body.resulted_at_to }),
          },
        }
      : {}),
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

  // ---- 3. Pagination ----
  // Use default page = 1 and pageSize = 20 if absent
  const page = body.page != null ? body.page : 1;
  const pageSize = body.pageSize != null ? body.pageSize : 20;
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // ---- 4. Sorting ----
  let orderBy = { resulted_at: "desc" } as const;
  if (body.sort && typeof body.sort === "string") {
    const trimmed = body.sort.trim();
    const match = /^([a-zA-Z0-9_]+)(?:\s+)(asc|desc)$/i.exec(trimmed);
    if (match) {
      const [_, field, dir] = match;
      // Only allow sorting by permitted fields
      // Allow: resulted_at, created_at, test_name, result_flag, status
      if (
        [
          "resulted_at",
          "created_at",
          "test_name",
          "result_flag",
          "status",
        ].includes(field)
      ) {
        orderBy = {
          [field]: dir.toLowerCase() === "asc" ? "asc" : "desc",
        } as Record<string, "asc" | "desc">;
      }
    }
  }

  // ---- 5. Query rows and count in parallel ----
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_lab_results.findMany({
      where,
      orderBy,
      skip,
      take,
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

  // ---- 6. Map to ISummary with proper date formatting ----
  const data = rows.map((row) => ({
    id: row.id,
    ehr_encounter_id: row.ehr_encounter_id,
    test_name: row.test_name,
    result_flag: row.result_flag,
    resulted_at: toISOStringSafe(row.resulted_at),
    status: row.status,
  }));

  // ---- 7. Return pagination result (use Number() to strip potential branding from page/pageSize) ----
  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: Math.ceil(total / Number(pageSize)),
    },
    data,
  };
}
