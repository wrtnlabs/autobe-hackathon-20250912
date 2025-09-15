import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRecordAmendment";
import { IPageIHealthcarePlatformRecordAmendment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformRecordAmendment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a paginated index of record amendments for a specific patient record
 *
 * This endpoint provides search, filter, and audit capabilities over the
 * amendments log for a given patient record. Results include metadata, details,
 * status, and supporting fields for compliance and regulatory audit—all
 * returned in paginated form. Only organizationadmin users with sufficient
 * permissions may invoke this endpoint.
 *
 * @param props - Request props
 * @param props.organizationAdmin - Authenticated organizationadmin user
 * @param props.patientRecordId - UUID of the patient record to fetch amendments
 *   for
 * @param props.body - Filter and pagination parameters for searching amendments
 * @returns Paginated index of record amendments for the target patient record
 * @throws {Error} If patient record does not exist or is deleted, or if
 *   unauthorized
 */
export async function patchhealthcarePlatformOrganizationAdminPatientRecordsPatientRecordIdRecordAmendments(props: {
  organizationAdmin: OrganizationadminPayload;
  patientRecordId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformRecordAmendment.IRequest;
}): Promise<IPageIHealthcarePlatformRecordAmendment> {
  const { organizationAdmin, patientRecordId, body } = props;

  // Authorization is implicitly performed via decorator/guard by presence of organizationAdmin

  // Validate: patient record exists and is not soft-deleted
  const patientRecord =
    await MyGlobal.prisma.healthcare_platform_patient_records.findFirst({
      where: {
        id: patientRecordId,
        deleted_at: null,
      },
    });
  if (!patientRecord) {
    throw new Error("Patient record not found or deleted");
  }

  // Pagination & sorting defaults
  const page = body.page !== undefined ? body.page : 0;
  const limit = body.limit !== undefined ? body.limit : 20;
  const allowedSortFields = ["created_at", "approval_status", "amendment_type"];
  const orderByKey =
    typeof body.sort === "string" && allowedSortFields.includes(body.sort)
      ? body.sort
      : "created_at";
  const orderByOrder = body.order === "asc" ? "asc" : "desc";

  // Build where filter respecting API shape, null vs undefined
  const where = {
    patient_record_id: patientRecordId,
    deleted_at: null,
    ...(body.amendment_type !== undefined &&
      body.amendment_type !== null && {
        amendment_type: body.amendment_type,
      }),
    ...(body.approval_status !== undefined &&
      body.approval_status !== null && {
        approval_status: body.approval_status,
      }),
    ...(body.reviewed_by_user_id !== undefined &&
      body.reviewed_by_user_id !== null && {
        reviewed_by_user_id: body.reviewed_by_user_id,
      }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && {
                gte: body.created_from,
              }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && {
                lte: body.created_to,
              }),
          },
        }
      : {}),
  };

  // Query result and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.healthcare_platform_record_amendments.findMany({
      where,
      orderBy: { [orderByKey]: orderByOrder },
      skip: Number(page) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.healthcare_platform_record_amendments.count({ where }),
  ]);

  // Normalize to IHealthcarePlatformRecordAmendment[]
  const data = rows.map((row) => ({
    id: row.id,
    patient_record_id: row.patient_record_id,
    submitted_by_user_id: row.submitted_by_user_id,
    reviewed_by_user_id:
      row.reviewed_by_user_id !== null && row.reviewed_by_user_id !== undefined
        ? row.reviewed_by_user_id
        : undefined,
    ehr_encounter_id:
      row.ehr_encounter_id !== null && row.ehr_encounter_id !== undefined
        ? row.ehr_encounter_id
        : undefined,
    amendment_type: row.amendment_type,
    old_value_json: row.old_value_json,
    new_value_json: row.new_value_json,
    rationale: row.rationale,
    approval_status:
      row.approval_status !== null && row.approval_status !== undefined
        ? row.approval_status
        : undefined,
    created_at: toISOStringSafe(row.created_at),
  }));

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
