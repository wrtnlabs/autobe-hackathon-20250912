import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsAssessment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessment";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Updates an existing assessment record identified by assessmentId within the
 * Enterprise LMS.
 *
 * This operation ensures that the assessment belongs to the tenant of the
 * organization admin and is not soft deleted. It validates the scheduled start
 * and end dates if both are provided, throwing an error if the schedule is
 * invalid.
 *
 * Only the fields provided in the body will be updated. The updated_at
 * timestamp is set to the current timestamp.
 *
 * @param props - Object containing organizationAdmin information, assessmentId,
 *   and update body
 * @returns Void
 * @throws {Error} If the assessment is not found, access is denied, or
 *   validation fails
 */
export async function putenterpriseLmsOrganizationAdminAssessmentsAssessmentId(props: {
  organizationAdmin: OrganizationadminPayload & {
    tenant_id: string & tags.Format<"uuid">;
  };
  assessmentId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsAssessment.IUpdate;
}): Promise<void> {
  const { organizationAdmin, assessmentId, body } = props;

  if (!("tenant_id" in organizationAdmin)) {
    throw new Error("Missing tenant_id property on organizationAdmin payload");
  }

  // Fetch the assessment and verify tenant ownership and not deleted
  const assessment = await MyGlobal.prisma.enterprise_lms_assessments.findFirst(
    {
      where: {
        id: assessmentId,
        tenant_id: organizationAdmin.tenant_id,
        deleted_at: null,
      },
    },
  );

  if (!assessment) {
    throw new Error("Assessment not found or access denied");
  }

  // Validate scheduled dates if both provided and not null
  if (
    body.scheduled_start_at !== undefined &&
    body.scheduled_end_at !== undefined &&
    body.scheduled_start_at !== null &&
    body.scheduled_end_at !== null
  ) {
    if (body.scheduled_start_at > body.scheduled_end_at) {
      throw new Error("scheduled_start_at cannot be after scheduled_end_at");
    }
  }

  // Perform update with only supplied fields
  await MyGlobal.prisma.enterprise_lms_assessments.update({
    where: { id: assessmentId },
    data: {
      code: body.code ?? undefined,
      title: body.title ?? undefined,
      description: body.description ?? undefined,
      assessment_type: body.assessment_type ?? undefined,
      max_score: body.max_score ?? undefined,
      passing_score: body.passing_score ?? undefined,
      scheduled_start_at: body.scheduled_start_at ?? undefined,
      scheduled_end_at: body.scheduled_end_at ?? undefined,
      status: body.status ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
