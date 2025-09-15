import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformLabResult";
import { IPageIHealthcarePlatformLabResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformLabResult";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Search and retrieve paginated laboratory results for a specific encounter and
 * patient record
 *
 * This API endpoint allows an authenticated organization admin to search and
 * retrieve a paginated, filtered list of laboratory results for a given patient
 * record and EHR encounter within their own organization. Results can be
 * filtered by test name, result flag, status, lab integration, and result or
 * creation time windows, and are sorted and paginated for efficient dashboard
 * display. Only users belonging to the correct organization can access this
 * data. Full authorization is enforced by verifying organizational boundary.
 *
 * @param props - Properties for the lab result search request
 * @param props.organizationAdmin - The authenticated organization admin
 *   performing the request
 * @param props.patientRecordId - The patient record UUID to query results for
 * @param props.encounterId - The EHR encounter UUID to filter within the
 *   patient record
 * @param props.body - Search/filter and pagination parameters
 *   (IHealthcarePlatformLabResult.IRequest)
 * @returns Paginated summary of laboratory results matching query criteria
 * @throws {Error} If patient record not found or not under admin's organization
 */
export async function patchhealthcarePlatformOrganizationAdminPatientRecordsPatientRecordIdEncountersEncounterIdLabResults(props: {
  organizationAdmin: OrganizationadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
  encounterId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformLabResult.IRequest;
}): Promise<IPageIHealthcarePlatformLabResult.ISummary> {
  const { organizationAdmin, patientRecordId, encounterId, body } = props;

  // Step 1: Authorization (organization boundary enforced)
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: { id: patientRecordId },
    });
  if (patientRecord === null) throw new Error("Patient record not found");
  if (patientRecord.organization_id !== organizationAdmin.id)
    throw new Error("Forbidden: Patient record not under your organization");

  // Step 2: Build filter conditions
  const page = body.page ?? 1;
  const pageSize = body.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  // Acceptable fields for sort: only those mapped directly in summary DTO
  const allowedSortFields = [
    "resulted_at",
    "test_name",
    "result_flag",
    "status",
  ];
  let orderBy: Record<string, string> = { resulted_at: "desc" };
  if (body.sort && typeof body.sort === "string") {
    const match = /^([a-zA-Z0-9_]+)\s*(asc|desc)?$/i.exec(body.sort);
    if (match && allowedSortFields.includes(match[1])) {
      orderBy = {
        [match[1]]: match[2]?.toLowerCase() === "asc" ? "asc" : "desc",
      };
    }
  }

  // Where clause: required and all optionals
  const where = {
    patient_record_id: patientRecordId,
    ehr_encounter_id: encounterId,
    deleted_at: null,
    ...(body.lab_integration_id !== undefined &&
      body.lab_integration_id !== null && {
        lab_integration_id: body.lab_integration_id,
      }),
    ...(body.test_name !== undefined &&
      body.test_name !== null && {
        test_name: { contains: body.test_name },
      }),
    ...(body.result_flag !== undefined &&
      body.result_flag !== null && {
        result_flag: body.result_flag,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
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

  // Step 3: Query count and results
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_lab_results.count({ where }),
    MyGlobal.prisma.healthcare_platform_lab_results.findMany({
      where,
      select: {
        id: true,
        ehr_encounter_id: true,
        test_name: true,
        result_flag: true,
        resulted_at: true,
        status: true,
      },
      orderBy,
      skip,
      take: pageSize,
    }),
  ]);

  // Step 4: Assemble result items
  const data = rows.map((row) => ({
    id: row.id,
    ehr_encounter_id: row.ehr_encounter_id,
    test_name: row.test_name,
    result_flag: row.result_flag,
    resulted_at: toISOStringSafe(row.resulted_at),
    status: row.status,
  }));

  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data,
  };
}
