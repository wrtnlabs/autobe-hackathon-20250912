import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformRiskAssessment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformRiskAssessment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing HealthcarePlatformRiskAssessment entity by
 * riskAssessmentId.
 *
 * This endpoint allows an authenticated organization admin to update a risk
 * assessment record's details, such as assessment type, methodology, risk
 * level, window, and recommendations, within the boundary of their assigned
 * organization. The operation enforces that only admins belonging to the same
 * organization as the risk assessment may perform the update. An update is
 * forbidden if the risk assessment has already reached a 'completed' status, to
 * preserve compliance with audit and regulatory requirements. All updates
 * result in the 'updated_at' field being set to the current system time. Only
 * specified fields in the request body may be updated; immutable fields (id,
 * organization_id, created_at, deleted_at) are preserved.
 *
 * @param props - Object containing:
 *
 *   - OrganizationAdmin: The authenticated organization admin user payload
 *   - RiskAssessmentId: The UUID of the risk assessment record to update
 *   - Body: Partial update object specifying which fields to update
 *
 * @returns The updated risk assessment record in canonical business DTO format
 * @throws {Error} If the risk assessment doesn't exist
 * @throws {Error} If the organization context doesn't match
 * @throws {Error} If attempting to update a completed risk assessment
 */
export async function puthealthcarePlatformOrganizationAdminRiskAssessmentsRiskAssessmentId(props: {
  organizationAdmin: OrganizationadminPayload;
  riskAssessmentId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformRiskAssessment.IUpdate;
}): Promise<IHealthcarePlatformRiskAssessment> {
  const { organizationAdmin, riskAssessmentId, body } = props;
  // 1. Lookup risk assessment, throw if not found
  const existing =
    await MyGlobal.prisma.healthcare_platform_risk_assessments.findUnique({
      where: { id: riskAssessmentId },
    });
  if (!existing) throw new Error("Risk assessment not found");

  // 2. Authorization: Confirm this org admin controls this organization
  if (existing.organization_id !== organizationAdmin.id) {
    throw new Error("Forbidden: Not authorized on this organization");
  }

  // 3. Forbid any modification if current status is completed
  if (existing.status === "completed") {
    throw new Error("Cannot update a completed risk assessment");
  }

  // 4. Define updatable fields only based on provided body
  const now = toISOStringSafe(new Date());
  const updateData: Record<string, unknown> = {
    ...(body.assessment_type !== undefined && {
      assessment_type: body.assessment_type,
    }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.methodology !== undefined && { methodology: body.methodology }),
    ...(body.risk_level !== undefined && { risk_level: body.risk_level }),
    ...(body.window_start !== undefined && { window_start: body.window_start }),
    ...(body.window_end !== undefined && { window_end: body.window_end }),
    ...(body.assessor_id !== undefined && { assessor_id: body.assessor_id }),
    ...(body.department_id !== undefined && {
      department_id: body.department_id,
    }),
    ...(body.recommendations !== undefined && {
      recommendations: body.recommendations,
    }),
    updated_at: now,
  };

  // 5. Update entity
  const updated =
    await MyGlobal.prisma.healthcare_platform_risk_assessments.update({
      where: { id: riskAssessmentId },
      data: updateData,
    });

  // 6. Map to canonical DTO type, converting dates
  return {
    id: updated.id,
    organization_id: updated.organization_id,
    assessor_id: updated.assessor_id ?? undefined,
    department_id: updated.department_id ?? undefined,
    assessment_type: updated.assessment_type,
    status: updated.status,
    methodology: updated.methodology,
    risk_level: updated.risk_level,
    window_start: toISOStringSafe(updated.window_start),
    window_end: toISOStringSafe(updated.window_end),
    recommendations: updated.recommendations ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
