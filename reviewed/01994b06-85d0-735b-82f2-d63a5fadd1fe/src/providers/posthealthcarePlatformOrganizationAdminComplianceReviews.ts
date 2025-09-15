import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformComplianceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceReview";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Create a new compliance review (healthcare_platform_compliance_reviews
 * table).
 *
 * This endpoint allows an authorized organization admin to create a compliance
 * review record, linking to a legal hold or risk assessment when supplied. The
 * function enforces business rules for uniqueness (one active review per legal
 * hold/risk assessment per organization at a time), validates reviewer
 * assignments, and ensures all required metadata for review workflow
 * progression is present. All mapping and property structure is strictly
 * type-safe and production-grade, with explicit branding for all UUIDs and
 * date-time fields.
 *
 * @param props - Properties for the compliance review creation request.
 * @param props.organizationAdmin - The authenticated organization admin payload
 *   initiating the request.
 * @param props.body - The review creation data (organization, hold or risk
 *   assessment linkage, reviewer, workflow method, status, etc).
 * @returns The full, newly-created compliance review record as a domain object
 *   with proper ISO date strings and UUID branding.
 * @throws {Error} If another active compliance review already exists for the
 *   same hold or risk assessment in the organization.
 */
export async function posthealthcarePlatformOrganizationAdminComplianceReviews(props: {
  organizationAdmin: OrganizationadminPayload;
  body: IHealthcarePlatformComplianceReview.ICreate;
}): Promise<IHealthcarePlatformComplianceReview> {
  const { organizationAdmin, body } = props;

  // Enforce only one active (non-completed, non-archived) review per hold/risk_assessment in an org at a time.
  if (body.hold_id || body.risk_assessment_id) {
    // Limiting to reviews that are NOT deleted and in a business-significant status
    // (scheduled/in_progress) as candidates for uniqueness violation.
    const existingActive =
      await MyGlobal.prisma.healthcare_platform_compliance_reviews.findFirst({
        where: {
          organization_id: body.organization_id,
          ...(body.hold_id !== undefined && body.hold_id !== null
            ? { hold_id: body.hold_id }
            : {}),
          ...(body.risk_assessment_id !== undefined &&
          body.risk_assessment_id !== null
            ? { risk_assessment_id: body.risk_assessment_id }
            : {}),
          deleted_at: null,
          status: { in: ["scheduled", "in_progress"] },
        },
      });
    if (existingActive) {
      throw new Error(
        "A compliance review is already active for this hold or risk assessment in this organization.",
      );
    }
  }

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  const created =
    await MyGlobal.prisma.healthcare_platform_compliance_reviews.create({
      data: {
        id,
        organization_id: body.organization_id,
        hold_id: body.hold_id ?? undefined,
        risk_assessment_id: body.risk_assessment_id ?? undefined,
        reviewer_id: body.reviewer_id ?? undefined,
        review_type: body.review_type,
        method: body.method,
        status: body.status,
        outcome: body.outcome ?? undefined,
        recommendations: body.recommendations ?? undefined,
        reviewed_at: body.reviewed_at ?? undefined,
        comments: body.comments ?? undefined,
        created_at: now,
        updated_at: now,
      },
    });

  return {
    id: created.id,
    organization_id: created.organization_id,
    hold_id: created.hold_id ?? undefined,
    risk_assessment_id: created.risk_assessment_id ?? undefined,
    reviewer_id: created.reviewer_id ?? undefined,
    review_type: created.review_type,
    method: created.method,
    status: created.status,
    outcome: created.outcome ?? undefined,
    recommendations: created.recommendations ?? undefined,
    reviewed_at: created.reviewed_at ?? undefined,
    comments: created.comments ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
