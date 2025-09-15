import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Permanently delete a HealthcarePlatformRiskAssessment entity by
 * riskAssessmentId.
 *
 * This operation irreversibly removes the specified risk assessment record from
 * the healthcarePlatform system. Only authorized organization admins may
 * perform this action, and cross-organization access is strictly prohibited.
 * Attempts to delete non-existent or out-of-organization records result in
 * errors.
 *
 * @param props.organizationAdmin - Payload for the authenticated organization
 *   admin, containing their user id
 * @param props.riskAssessmentId - Unique identifier (UUID) for the risk
 *   assessment to be deleted
 * @returns Void
 * @throws {Error} If the risk assessment does not exist
 * @throws {Error} If the admin is not assigned to an active organization
 * @throws {Error} If the admin's organization does not match the risk
 *   assessment's organization
 */
export async function deletehealthcarePlatformOrganizationAdminRiskAssessmentsRiskAssessmentId(props: {
  organizationAdmin: OrganizationadminPayload;
  riskAssessmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { organizationAdmin, riskAssessmentId } = props;

  // Step 1: Lookup the risk assessment by ID (must exist)
  const riskAssessment =
    await MyGlobal.prisma.healthcare_platform_risk_assessments.findUnique({
      where: { id: riskAssessmentId },
      select: { id: true, organization_id: true },
    });
  if (!riskAssessment) {
    throw new Error("Risk assessment not found");
  }

  // Step 2: Lookup the admin's organization assignment (must be active)
  const orgAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        assignment_status: "active",
        deleted_at: null,
      },
      select: { healthcare_platform_organization_id: true },
    });
  if (!orgAssignment) {
    throw new Error("Organization admin has no active organization assignment");
  }

  // Step 3: Enforce that risk assessment belongs to admin's org
  if (
    riskAssessment.organization_id !==
    orgAssignment.healthcare_platform_organization_id
  ) {
    throw new Error(
      "Not authorized to delete risk assessments from another organization",
    );
  }

  // Step 4: Perform a hard delete (no soft-delete field used)
  await MyGlobal.prisma.healthcare_platform_risk_assessments.delete({
    where: { id: riskAssessmentId },
  });
}
