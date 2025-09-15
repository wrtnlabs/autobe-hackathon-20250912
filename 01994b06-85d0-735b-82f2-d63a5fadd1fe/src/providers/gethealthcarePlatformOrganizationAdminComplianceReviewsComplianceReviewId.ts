import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformComplianceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceReview";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Retrieve a compliance review by its ID
 * (healthcare_platform_compliance_reviews table).
 *
 * This function fetches and returns detailed metadata for a single compliance
 * review entity using its unique identifier. It enforces strict soft-delete
 * semantics, ensuring only active (non-archived) reviews are returned. All
 * date/datetime fields are normalized to ISO 8601 string format. If no entity
 * is found, or if the record is archived, an error is thrown. The operation is
 * restricted to authenticated organization admins, whose payload is required
 * for access.
 *
 * @param props - Request properties
 * @param props.organizationAdmin - The authenticated organization admin
 *   requesting the compliance review.
 * @param props.complianceReviewId - UUID of the compliance review to retrieve
 * @returns The detailed compliance review record as an
 *   IHealthcarePlatformComplianceReview
 * @throws {Error} When the compliance review is not found or has been archived
 */
export async function gethealthcarePlatformOrganizationAdminComplianceReviewsComplianceReviewId(props: {
  organizationAdmin: OrganizationadminPayload;
  complianceReviewId: string & tags.Format<"uuid">;
}): Promise<IHealthcarePlatformComplianceReview> {
  const { organizationAdmin, complianceReviewId } = props;

  const review =
    await MyGlobal.prisma.healthcare_platform_compliance_reviews.findFirst({
      where: {
        id: complianceReviewId,
        deleted_at: null,
      },
    });

  if (!review) {
    throw new Error("Compliance review not found");
  }

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
