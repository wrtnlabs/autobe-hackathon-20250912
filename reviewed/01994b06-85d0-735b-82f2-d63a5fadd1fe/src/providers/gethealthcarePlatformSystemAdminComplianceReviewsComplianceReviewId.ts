import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformComplianceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceReview";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Retrieve a compliance review by its ID
 * (healthcare_platform_compliance_reviews table).
 *
 * Retrieves detailed compliance review data for a single compliance review
 * entity. This includes review type, methodology, status, reviewer information,
 * outcome, recommendations, timestamps, and any linked legal hold or risk
 * assessment references. Accessible only to system administrators for
 * regulatory-compliance and audit traceability purposes.
 *
 * @param props - Operation parameters
 * @param props.systemAdmin - The authenticated SystemadminPayload for
 *   authorization (validated by decorator)
 * @param props.complianceReviewId - Unique identifier for the compliance review
 *   (UUID)
 * @returns Detailed information for the compliance review entity, as structured
 *   in IHealthcarePlatformComplianceReview
 * @throws {Error} If no review with the specified ID is found, or if access is
 *   forbidden by authorization layer.
 */
export async function gethealthcarePlatformSystemAdminComplianceReviewsComplianceReviewId(props: {
  systemAdmin: SystemadminPayload;
  complianceReviewId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformComplianceReview> {
  const { complianceReviewId } = props;

  const review =
    await MyGlobal.prisma.healthcare_platform_compliance_reviews.findUniqueOrThrow(
      {
        where: { id: complianceReviewId },
        select: {
          id: true,
          organization_id: true,
          hold_id: true,
          risk_assessment_id: true,
          reviewer_id: true,
          review_type: true,
          method: true,
          status: true,
          outcome: true,
          recommendations: true,
          reviewed_at: true,
          comments: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );

  return {
    id: review.id,
    organization_id: review.organization_id,
    hold_id: review.hold_id ?? undefined,
    risk_assessment_id: review.risk_assessment_id ?? undefined,
    reviewer_id: review.reviewer_id ?? undefined,
    review_type: review.review_type,
    method: review.method,
    status: review.status,
    outcome: review.outcome ?? undefined,
    recommendations: review.recommendations ?? undefined,
    reviewed_at: review.reviewed_at
      ? toISOStringSafe(review.reviewed_at)
      : undefined,
    comments: review.comments ?? undefined,
    created_at: toISOStringSafe(review.created_at),
    updated_at: toISOStringSafe(review.updated_at),
    deleted_at: review.deleted_at
      ? toISOStringSafe(review.deleted_at)
      : undefined,
  };
}
