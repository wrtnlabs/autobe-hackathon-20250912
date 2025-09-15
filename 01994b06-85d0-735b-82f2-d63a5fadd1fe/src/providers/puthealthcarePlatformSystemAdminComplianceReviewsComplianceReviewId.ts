import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformComplianceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceReview";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Update a compliance review record by its ID
 * (healthcare_platform_compliance_reviews table).
 *
 * This operation updates metadata, status, outcomes, or reviewer details of an
 * existing compliance review, subject to permission and lifecycle rules. All
 * field changes are logged for regulatory audit via the platform's audit log.
 * Only users with system admin compliance privileges may perform the update.
 * Date/datetime fields are strictly handled as strings.
 *
 * @param props - The props for this operation
 * @param props.systemAdmin - The authenticated system admin user
 * @param props.complianceReviewId - The unique identifier of the compliance
 *   review to update
 * @param props.body - Patch fields to update (only defined fields will be
 *   updated)
 * @returns The updated compliance review record
 * @throws Error if the compliance review is not found
 */
export async function puthealthcarePlatformSystemAdminComplianceReviewsComplianceReviewId(props: {
  systemAdmin: SystemadminPayload;
  complianceReviewId: string & tags.Format<"uuid">;
  body: IHealthcarePlatformComplianceReview.IUpdate;
}): Promise<IHealthcarePlatformComplianceReview> {
  const { systemAdmin, complianceReviewId, body } = props;

  // Fetch review and check for existence
  const old =
    await MyGlobal.prisma.healthcare_platform_compliance_reviews.findUnique({
      where: { id: complianceReviewId },
    });
  if (!old) throw new Error("Compliance review not found");

  // Prepare updated_at once
  const now = toISOStringSafe(new Date());

  // Patch data using only supplied body fields
  const patch = {
    ...(body.hold_id !== undefined && { hold_id: body.hold_id }),
    ...(body.risk_assessment_id !== undefined && {
      risk_assessment_id: body.risk_assessment_id,
    }),
    ...(body.reviewer_id !== undefined && { reviewer_id: body.reviewer_id }),
    ...(body.review_type !== undefined && { review_type: body.review_type }),
    ...(body.method !== undefined && { method: body.method }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.outcome !== undefined && { outcome: body.outcome }),
    ...(body.recommendations !== undefined && {
      recommendations: body.recommendations,
    }),
    ...(body.reviewed_at !== undefined && { reviewed_at: body.reviewed_at }),
    ...(body.comments !== undefined && { comments: body.comments }),
    updated_at: now,
  };

  const updated =
    await MyGlobal.prisma.healthcare_platform_compliance_reviews.update({
      where: { id: complianceReviewId },
      data: patch,
    });

  // Insert audit log entry for this update
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4(),
      user_id: systemAdmin.id,
      organization_id: updated.organization_id,
      action_type: "COMPLIANCE_REVIEW_UPDATE",
      event_context: JSON.stringify({ before: old, after: updated }),
      related_entity_type: "COMPLIANCE_REVIEW",
      related_entity_id: updated.id,
      created_at: now,
    },
  });

  return {
    id: updated.id,
    organization_id: updated.organization_id,
    hold_id: updated.hold_id ?? undefined,
    risk_assessment_id: updated.risk_assessment_id ?? undefined,
    reviewer_id: updated.reviewer_id ?? undefined,
    review_type: updated.review_type,
    method: updated.method,
    status: updated.status,
    outcome: updated.outcome ?? undefined,
    recommendations: updated.recommendations ?? undefined,
    reviewed_at: updated.reviewed_at ?? undefined,
    comments: updated.comments ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
