import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformComplianceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceReview";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update a compliance review record by its ID
 * (healthcare_platform_compliance_reviews table).
 *
 * This operation allows an authenticated organization admin to update workflow,
 * metadata, recommendations, and status fields of an existing compliance review
 * for their organization in a controlled, auditable fashion. Updates are
 * strictly validated: only permitted fields can be changed, attempts to
 * overwrite finalized outcome or reviewer recommendations on completed records
 * are rejected, and all referenced foreign keys (holds, assessments, reviewers)
 * are validated to exist and not be soft-deleted. Every update is tracked for
 * regulatory compliance.
 *
 * Authorization: Only organizationadmin users may update reviews in their own
 * organization (cross-checked).
 *
 * @param props - Operation parameters
 * @param props.organizationAdmin - Authenticated OrganizationadminPayload for
 *   permission enforcement
 * @param props.complianceReviewId - Unique identifier of the compliance review
 *   record to update
 * @param props.body - Fields to update in the compliance review
 *   (IHealthcarePlatformComplianceReview.IUpdate)
 * @returns The updated IHealthcarePlatformComplianceReview record after
 *   accepted changes
 * @throws {Error} When record not found, permission error, invalid FK
 *   references, immutability or validation failure
 */
export async function puthealthcarePlatformOrganizationAdminComplianceReviewsComplianceReviewId(props: {
  organizationAdmin: OrganizationadminPayload;
  complianceReviewId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformComplianceReview.IUpdate;
}): Promise<IHealthcarePlatformComplianceReview> {
  const { organizationAdmin, complianceReviewId, body } = props;

  // 1. Fetch the record; must not be soft-deleted
  const review =
    await MyGlobal.prisma.healthcare_platform_compliance_reviews.findFirst({
      where: { id: complianceReviewId, deleted_at: null },
    });
  if (!review) throw new Error("Compliance review not found");

  // 2. Ensure organizationadmin belongs to this organization
  // Cross-verification: must be assignment in org, but org id comes from review.organization_id
  const orgAdminAssignment =
    await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
      where: {
        user_id: organizationAdmin.id,
        healthcare_platform_organization_id: review.organization_id,
        deleted_at: null,
      },
    });
  if (!orgAdminAssignment)
    throw new Error("No permission: admin not assigned to organization");

  // 3. Validate any provided foreign keys (only if present and not null)
  if (body.hold_id !== undefined && body.hold_id !== null) {
    const hold =
      await MyGlobal.prisma.healthcare_platform_legal_holds.findFirst({
        where: { id: body.hold_id, deleted_at: null },
      });
    if (!hold) throw new Error("Legal hold not found or deleted");
  }
  if (
    body.risk_assessment_id !== undefined &&
    body.risk_assessment_id !== null
  ) {
    const risk =
      await MyGlobal.prisma.healthcare_platform_risk_assessments.findFirst({
        where: { id: body.risk_assessment_id, deleted_at: null },
      });
    if (!risk) throw new Error("Risk assessment not found or deleted");
  }
  if (body.reviewer_id !== undefined && body.reviewer_id !== null) {
    const reviewer =
      await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
        where: { id: body.reviewer_id, deleted_at: null },
      });
    if (!reviewer) throw new Error("Reviewer assignment not found or deleted");
  }

  // 4. Disallow empty updates (no fields supplied)
  if (Object.keys(body).length === 0)
    throw new Error("No fields provided for update");

  // 5. Enforce immutability for outcome/recommendations/reviewed_at if review is finalized
  const finalizedStatuses = ["completed", "approved", "rejected"];
  if (finalizedStatuses.includes(review.status)) {
    if (
      body.outcome !== undefined ||
      body.recommendations !== undefined ||
      body.reviewed_at !== undefined
    ) {
      throw new Error(
        "This compliance review is finalized: outcome, recommendations, and reviewed_at cannot be updated",
      );
    }
  }

  // 6. Patch record, updating only supplied fields and updated_at
  const now = toISOStringSafe(new Date());
  const updated =
    await MyGlobal.prisma.healthcare_platform_compliance_reviews.update({
      where: { id: complianceReviewId },
      data: {
        hold_id: body.hold_id ?? undefined,
        risk_assessment_id: body.risk_assessment_id ?? undefined,
        reviewer_id: body.reviewer_id ?? undefined,
        review_type: body.review_type ?? undefined,
        method: body.method ?? undefined,
        status: body.status ?? undefined,
        outcome: body.outcome ?? undefined,
        recommendations: body.recommendations ?? undefined,
        reviewed_at: body.reviewed_at ?? undefined,
        comments: body.comments ?? undefined,
        updated_at: now,
      },
    });

  // 7. Audit log entry (asynchronous, non-blocking; ignore failures for main flow)
  void MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: orgAdminAssignment.id,
      organization_id: review.organization_id,
      action_type: "COMPLIANCE_REVIEW_UPDATE",
      event_context: JSON.stringify({
        complianceReviewId: review.id,
        patch: body,
      }),
      created_at: now,
    },
  });

  // 8. Return the updated record, converting dates with toISOStringSafe and null handling exact to DTO
  return {
    id: updated.id,
    organization_id: updated.organization_id,
    hold_id: updated.hold_id ?? null,
    risk_assessment_id: updated.risk_assessment_id ?? null,
    reviewer_id: updated.reviewer_id ?? null,
    review_type: updated.review_type,
    method: updated.method,
    status: updated.status,
    outcome: updated.outcome ?? null,
    recommendations: updated.recommendations ?? null,
    reviewed_at: updated.reviewed_at
      ? toISOStringSafe(updated.reviewed_at)
      : null,
    comments: updated.comments ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
