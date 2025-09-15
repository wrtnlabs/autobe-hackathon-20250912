import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessment";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

/**
 * Updates an existing assessment entity within the Enterprise LMS.
 *
 * Ensures multi-tenant isolation by restricting updates to assessments that
 * belong to the tenant associated with the authenticated systemAdmin. Validates
 * uniqueness of the assessment code within the tenant scope. Skips fields not
 * provided in the update payload.
 *
 * @param props - The object containing systemAdmin, assessmentId, and update
 *   body.
 * @param props.systemAdmin - Authenticated systemAdmin payload for tenant
 *   context.
 * @param props.assessmentId - UUID of the assessment to update.
 * @param props.body - Partial update data conforming to
 *   IEnterpriseLmsAssessment.IUpdate.
 * @throws {Error} When the assessment is not found or has been soft deleted.
 * @throws {Error} When the updated assessment code conflicts with an existing
 *   one in the same tenant.
 */
export async function putenterpriseLmsSystemAdminAssessmentsAssessmentId(props: {
  systemAdmin: SystemadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsAssessment.IUpdate;
}): Promise<void> {
  const { systemAdmin, assessmentId, body } = props;

  // Fetch existing assessment ensuring tenant isolation and active record
  const existingAssessment =
    await MyGlobal.prisma.enterprise_lms_assessments.findFirst({
      where: {
        id: assessmentId,
        tenant_id: systemAdmin.id,
        deleted_at: null,
      },
    });

  if (!existingAssessment) {
    throw new Error("Assessment not found or inaccessible");
  }

  // If code is updated and changed, verify uniqueness within tenant
  if (body.code !== undefined && body.code !== existingAssessment.code) {
    const duplicateCodeAssessment =
      await MyGlobal.prisma.enterprise_lms_assessments.findFirst({
        where: {
          tenant_id: existingAssessment.tenant_id,
          code: body.code,
          id: { not: assessmentId },
          deleted_at: null,
        },
      });

    if (duplicateCodeAssessment) {
      throw new Error("Assessment code already exists within the tenant");
    }
  }

  // Prepare update data, skipping undefined fields
  const updateData: IEnterpriseLmsAssessment.IUpdate = {
    code: body.code ?? undefined,
    title: body.title ?? undefined,
    description: body.description ?? undefined,
    assessment_type: body.assessment_type ?? undefined,
    max_score: body.max_score ?? undefined,
    passing_score: body.passing_score ?? undefined,
    scheduled_start_at: body.scheduled_start_at ?? undefined,
    scheduled_end_at: body.scheduled_end_at ?? undefined,
    status: body.status ?? undefined,
  };

  await MyGlobal.prisma.enterprise_lms_assessments.update({
    where: { id: assessmentId },
    data: updateData,
  });
}
