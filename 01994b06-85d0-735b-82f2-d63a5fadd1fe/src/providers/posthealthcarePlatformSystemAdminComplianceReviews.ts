import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IHealthcarePlatformComplianceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformComplianceReview";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Create a new compliance review (healthcare_platform_compliance_reviews
 * table).
 *
 * This operation creates a new compliance review record for a given
 * organization, optionally linking a legal hold, risk assessment, and
 * designated reviewer. Checks are enforced so that only authorized system
 * administrators may perform this action. References are validated, and
 * business constraints ensure only one active review may exist for a hold or
 * risk assessment per organization at a time. All dates are handled as strings
 * in ISO 8601 format with appropriate branding. On success, the newly created
 * compliance review record is returned.
 *
 * @param props - Object containing authentication (systemAdmin) and creation
 *   request body.
 * @param props.systemAdmin - Authenticated system administrator issuing the
 *   request.
 * @param props.body - The details of the compliance review to create.
 * @returns The newly created compliance review entity.
 * @throws {Error} When the organization, referenced hold, risk assessment, or
 *   reviewer does not exist (or is soft-deleted).
 * @throws {Error} If there is already an active (not deleted) compliance review
 *   record for the same org+hold or org+risk_assessment.
 */
export async function posthealthcarePlatformSystemAdminComplianceReviews(props: {
  systemAdmin: SystemadminPayload;
  body: IHealthcarePlatformComplianceReview.ICreate;
}): Promise<IHealthcarePlatformComplianceReview> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // 1. Validate organization existence and not deleted
  const org = await MyGlobal.prisma.healthcare_platform_organizations.findFirst(
    {
      where: {
        id: props.body.organization_id,
        deleted_at: null,
      },
    },
  );
  if (!org) {
    throw new Error("Organization not found or deleted");
  }

  // 2. Validate legal hold exists for org (if present)
  if (props.body.hold_id !== undefined && props.body.hold_id !== null) {
    const hold =
      await MyGlobal.prisma.healthcare_platform_legal_holds.findFirst({
        where: {
          id: props.body.hold_id,
          organization_id: props.body.organization_id,
          deleted_at: null,
        },
      });
    if (!hold) {
      throw new Error(
        "Legal hold not found for the organization or is deleted",
      );
    }
  }

  // 3. Validate risk assessment exists for org (if present)
  if (
    props.body.risk_assessment_id !== undefined &&
    props.body.risk_assessment_id !== null
  ) {
    const risk =
      await MyGlobal.prisma.healthcare_platform_risk_assessments.findFirst({
        where: {
          id: props.body.risk_assessment_id,
          organization_id: props.body.organization_id,
          deleted_at: null,
        },
      });
    if (!risk) {
      throw new Error(
        "Risk assessment not found for the organization or is deleted",
      );
    }
  }

  // 4. Validate reviewer exists (if present)
  if (props.body.reviewer_id !== undefined && props.body.reviewer_id !== null) {
    const reviewer =
      await MyGlobal.prisma.healthcare_platform_user_org_assignments.findFirst({
        where: {
          id: props.body.reviewer_id,
          deleted_at: null,
        },
      });
    if (!reviewer) {
      throw new Error("Reviewer not found or is deleted");
    }
  }

  // 5. Enforce unique active review constraint (org+hold or org+risk_assessment)
  if (props.body.hold_id !== undefined && props.body.hold_id !== null) {
    const conflict =
      await MyGlobal.prisma.healthcare_platform_compliance_reviews.findFirst({
        where: {
          organization_id: props.body.organization_id,
          hold_id: props.body.hold_id,
          deleted_at: null,
        },
      });
    if (conflict) {
      throw new Error(
        "An active compliance review already exists for this legal hold in this organization",
      );
    }
  }
  if (
    props.body.risk_assessment_id !== undefined &&
    props.body.risk_assessment_id !== null
  ) {
    const conflict =
      await MyGlobal.prisma.healthcare_platform_compliance_reviews.findFirst({
        where: {
          organization_id: props.body.organization_id,
          risk_assessment_id: props.body.risk_assessment_id,
          deleted_at: null,
        },
      });
    if (conflict) {
      throw new Error(
        "An active compliance review already exists for this risk assessment in this organization",
      );
    }
  }

  // 6. Create the compliance review entry
  const created =
    await MyGlobal.prisma.healthcare_platform_compliance_reviews.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        organization_id: props.body.organization_id,
        hold_id: props.body.hold_id ?? null,
        risk_assessment_id: props.body.risk_assessment_id ?? null,
        reviewer_id: props.body.reviewer_id ?? null,
        review_type: props.body.review_type,
        method: props.body.method,
        status: props.body.status,
        outcome: props.body.outcome ?? null,
        recommendations: props.body.recommendations ?? null,
        reviewed_at: props.body.reviewed_at ?? null,
        comments: props.body.comments ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
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
    reviewed_at: created.reviewed_at
      ? toISOStringSafe(created.reviewed_at)
      : undefined,
    comments: created.comments ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
