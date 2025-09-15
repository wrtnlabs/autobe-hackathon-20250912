import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Create a new interview session/entity (ats_recruitment_interviews table)
 * associated with an application, with stage, status, and participant
 * information.
 *
 * This endpoint enables HR recruiters to create a new interview event linked to
 * an applicant's active application. It ensures the authenticated HR recruiter
 * is the owner of the referenced application and validates that the referenced
 * application is present and not deleted. The created interview includes all
 * user-supplied fields, normalized timestamp and deletion information, with
 * downstream notification or calendar sync potentially triggered elsewhere.
 *
 * Validation:
 *
 * - The referenced application must exist and not be soft-deleted (deleted_at
 *   null)
 * - The currently authenticated HR recruiter must be the owner of the referenced
 *   application's job posting (jobPosting.hr_recruiter_id === hrRecruiter.id)
 *
 * @param props - Input containing the authenticated HR recruiter and creation
 *   payload
 * @param props.hrRecruiter - Authenticated HR recruiter making the request
 * @param props.body - Interview creation payload (application, stage, status,
 *   notes, etc.)
 * @returns The newly created interview entity as IAtsRecruitmentInterview
 * @throws {Error} If the application does not exist, is deleted, or not owned
 *   by this recruiter
 */
export async function postatsRecruitmentHrRecruiterInterviews(props: {
  hrRecruiter: HrrecruiterPayload;
  body: IAtsRecruitmentInterview.ICreate;
}): Promise<IAtsRecruitmentInterview> {
  const { hrRecruiter, body } = props;

  // Validate application exists and is not deleted
  const application =
    await MyGlobal.prisma.ats_recruitment_applications.findFirst({
      where: {
        id: body.ats_recruitment_application_id,
        deleted_at: null,
      },
      include: {
        jobPosting: true,
      },
    });
  if (!application)
    throw new Error("Referenced application not found or deleted");

  // Only allow recruiters to create interviews for their own postings/applications
  if (
    !application.jobPosting ||
    application.jobPosting.hr_recruiter_id !== hrRecruiter.id
  )
    throw new Error(
      "Forbidden: Cannot schedule interview for another recruiter's application",
    );

  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.ats_recruitment_interviews.create({
    data: {
      id: v4(),
      ats_recruitment_application_id: body.ats_recruitment_application_id,
      title: body.title,
      stage: body.stage,
      status: body.status,
      notes: body.notes ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    ats_recruitment_application_id: created.ats_recruitment_application_id,
    title: created.title,
    stage: created.stage,
    status: created.status,
    notes: created.notes ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
