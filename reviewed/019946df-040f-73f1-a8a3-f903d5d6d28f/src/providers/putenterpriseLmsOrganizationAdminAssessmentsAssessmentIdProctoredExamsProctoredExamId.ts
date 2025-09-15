import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IEnterpriseLmsProctoredExam } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsProctoredExam";
import { OrganizationadminPayload } from "../decorators/payload/OrganizationadminPayload";

/**
 * Update an existing proctored exam session by ID for a specific assessment.
 *
 * This operation allows organization administrators to modify scheduling,
 * proctor assignment, and status of a proctored exam within the context of the
 * specified assessment.
 *
 * Authorization is enforced by validating the organization admin's tenant
 * affiliation matches the assessment's tenant.
 *
 * All date and datetime fields are converted to ISO string format using
 * toISOStringSafe() utility, ensuring compliance with API contract and type
 * safety rules.
 *
 * @param props - Operation parameters including organization admin info,
 *   assessment ID, proctored exam ID, and update body data
 * @returns The fully updated proctored exam entity
 * @throws {Error} When the proctored exam or assessment is not found
 * @throws {Error} When the organization admin's tenant does not match the
 *   assessment's tenant (unauthorized)
 */
export async function putenterpriseLmsOrganizationAdminAssessmentsAssessmentIdProctoredExamsProctoredExamId(props: {
  organizationAdmin: OrganizationadminPayload;
  assessmentId: string & tags.Format<"uuid">;
  proctoredExamId: string & tags.Format<"uuid">;
  body: IEnterpriseLmsProctoredExam.IUpdate;
}): Promise<IEnterpriseLmsProctoredExam> {
  const { organizationAdmin, assessmentId, proctoredExamId, body } = props;

  // Fetch organizationAdmin full record to get tenant_id for authorization
  const adminRecord =
    await MyGlobal.prisma.enterprise_lms_organizationadmin.findUniqueOrThrow({
      where: { id: organizationAdmin.id },
    });

  // Fetch assessment with tenant information
  const assessment =
    await MyGlobal.prisma.enterprise_lms_assessments.findUniqueOrThrow({
      where: { id: assessmentId },
    });

  if (adminRecord.tenant_id !== assessment.tenant_id) {
    throw new Error("Unauthorized: Organization admin tenant mismatch");
  }

  // Fetch the proctored exam to confirm existence and ownership
  const proctoredExam =
    await MyGlobal.prisma.enterprise_lms_proctored_exams.findFirstOrThrow({
      where: {
        id: proctoredExamId,
        assessment_id: assessmentId,
      },
    });

  // Prepare and perform the update with only defined fields, no intermediate variable
  const updated = await MyGlobal.prisma.enterprise_lms_proctored_exams.update({
    where: { id: proctoredExamId },
    data: {
      ...(body.assessment_id !== undefined && {
        assessment_id: body.assessment_id,
      }),
      ...(body.exam_session_id !== undefined && {
        exam_session_id: body.exam_session_id,
      }),
      ...(body.proctor_id !== undefined && { proctor_id: body.proctor_id }),
      ...(body.scheduled_at !== undefined && {
        scheduled_at: body.scheduled_at,
      }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.updated_at !== undefined && { updated_at: body.updated_at }),
      ...(body.deleted_at !== undefined && { deleted_at: body.deleted_at }),
    },
  });

  // Return with all date fields properly converted using toISOStringSafe
  return {
    id: updated.id,
    assessment_id: updated.assessment_id,
    exam_session_id: updated.exam_session_id,
    proctor_id: updated.proctor_id ?? undefined,
    scheduled_at: toISOStringSafe(updated.scheduled_at),
    status: updated.status as
      | "scheduled"
      | "in_progress"
      | "completed"
      | "cancelled",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
