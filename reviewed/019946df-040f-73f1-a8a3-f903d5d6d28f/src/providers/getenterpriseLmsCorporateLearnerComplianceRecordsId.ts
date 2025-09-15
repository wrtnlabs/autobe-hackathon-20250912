import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsComplianceRecords } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsComplianceRecords";
import { CorporatelearnerPayload } from "../decorators/payload/CorporatelearnerPayload";

/**
 * Retrieve detailed information about a specific compliance record by its
 * unique identifier.
 *
 * This operation fetches compliance status, types, and audit details stored in
 * enterprise_lms_compliance_records. Only authorized users with role
 * 'corporateLearner' can access this information.
 *
 * @param props - Object containing the authenticated corporateLearner payload
 *   and compliance record ID
 * @param props.corporateLearner - Authenticated corporate learner payload
 * @param props.id - Unique identifier (UUID) of the compliance record to
 *   retrieve
 * @returns Detailed compliance record matching the requested ID
 * @throws {Error} When the compliance record is not found
 * @throws {Error} When the requester is not authorized to access the record
 */
export async function getenterpriseLmsCorporateLearnerComplianceRecordsId(props: {
  corporateLearner: CorporatelearnerPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEnterpriseLmsComplianceRecords> {
  const { corporateLearner, id } = props;

  const record =
    await MyGlobal.prisma.enterprise_lms_compliance_records.findUnique({
      where: { id },
    });

  if (!record) throw new Error("Compliance record not found");

  if (record.learner_id !== corporateLearner.id) {
    throw new Error("Unauthorized access to compliance record");
  }

  return {
    id: record.id,
    learner_id: record.learner_id,
    tenant_id: record.tenant_id,
    compliance_type: record.compliance_type,
    compliance_status: record.compliance_status,
    details: record.details ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
  };
}
