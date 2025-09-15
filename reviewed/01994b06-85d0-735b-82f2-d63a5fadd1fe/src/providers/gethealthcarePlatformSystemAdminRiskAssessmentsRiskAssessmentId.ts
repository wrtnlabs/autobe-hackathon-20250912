import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRiskAssessment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRiskAssessment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve full, detailed information for a specific risk assessment by
 * riskAssessmentId.
 *
 * This function fetches the detailed metadata, context, methodology,
 * recommendations, and audit information for a risk assessment record from the
 * healthcare_platform_risk_assessments table. It is used by system
 * administrators, compliance staff, and auditors to review the full lifecycle
 * of an assessment, including findings and recommendations, for regulatory,
 * compliance, and operational analysis.
 *
 * The function ensures only authorized system administrators can access the
 * specified record. If the risk assessment does not exist or has been
 * soft-deleted, an error is thrown. All date and timestamp fields are returned
 * as ISO 8601 formatted strings per the public API schema.
 *
 * @param props - The input parameters object
 * @param props.systemAdmin - SystemadminPayload containing credential info for
 *   the system administrator
 * @param props.riskAssessmentId - The UUID of the risk assessment to retrieve
 * @returns The fully-detailed risk assessment record in API DTO format
 * @throws {Error} If the risk assessment is not found or is soft-deleted
 */
export async function gethealthcarePlatformSystemAdminRiskAssessmentsRiskAssessmentId(props: {
  systemAdmin: SystemadminPayload;
  riskAssessmentId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformRiskAssessment> {
  const { riskAssessmentId } = props;
  const record =
    await MyGlobal.prisma.healthcare_platform_risk_assessments.findFirst({
      where: { id: riskAssessmentId, deleted_at: null },
    });
  if (!record) {
    throw new Error("Risk assessment not found");
  }
  return {
    id: record.id,
    organization_id: record.organization_id,
    assessor_id:
      typeof record.assessor_id === "string" ? record.assessor_id : undefined,
    department_id:
      typeof record.department_id === "string"
        ? record.department_id
        : undefined,
    assessment_type: record.assessment_type,
    status: record.status,
    methodology: record.methodology,
    risk_level: record.risk_level,
    window_start: toISOStringSafe(record.window_start),
    window_end: toISOStringSafe(record.window_end),
    recommendations:
      typeof record.recommendations === "string"
        ? record.recommendations
        : undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  };
}
