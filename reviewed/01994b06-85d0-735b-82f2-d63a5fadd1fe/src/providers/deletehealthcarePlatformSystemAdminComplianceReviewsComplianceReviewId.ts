import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Erases (soft deletes) a compliance review record by its UUID.
 *
 * This operation sets the 'deleted_at' field on the compliance review, marking
 * the record as deleted for audit and regulatory retention purposes. Only
 * privileged system administrators can perform this operation. Every erasure is
 * recorded in the audit log for full traceability.
 *
 * @param props - Parameters for the operation
 * @param props.systemAdmin - Authenticated Systemadmin user performing the
 *   erasure
 * @param props.complianceReviewId - UUID of the compliance review to soft
 *   delete
 * @returns Void
 * @throws {Error} If the record does not exist, is already deleted, or
 *   authorization/locking prevents erasure
 */
export async function deletehealthcarePlatformSystemAdminComplianceReviewsComplianceReviewId(props: {
  systemAdmin: SystemadminPayload;
  complianceReviewId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { systemAdmin, complianceReviewId } = props;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Step 1: Fetch compliance review record, ensure it's active
  const review =
    await MyGlobal.prisma.healthcare_platform_compliance_reviews.findFirst({
      where: { id: complianceReviewId },
    });

  if (!review || review.deleted_at !== null) {
    throw new Error("Compliance review not found or already deleted");
  }

  // Step 2: Soft delete (set deleted_at)
  await MyGlobal.prisma.healthcare_platform_compliance_reviews.update({
    where: { id: complianceReviewId },
    data: { deleted_at: now },
  });

  // Step 3: Write audit log
  await MyGlobal.prisma.healthcare_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">, // TypeScript will enforce UUID branding
      user_id: systemAdmin.id,
      organization_id: review.organization_id,
      action_type: "COMPLIANCE_REVIEW_DELETE",
      event_context: JSON.stringify({
        operation: "soft_delete_compliance_review",
        performed_by: systemAdmin.id,
        compliance_review_id: complianceReviewId,
        timestamp: now,
        reason: "Systemadmin initiated erasure for compliance retention.",
      }),
      related_entity_type: "compliance_review",
      related_entity_id: complianceReviewId,
      created_at: now,
    },
  });
}
