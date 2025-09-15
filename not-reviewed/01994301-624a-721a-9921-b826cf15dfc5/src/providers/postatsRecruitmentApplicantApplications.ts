import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import { ApplicantPayload } from "../decorators/payload/ApplicantPayload";

/**
 * Create a new job application for a specific job posting by an authorized
 * applicant.
 *
 * This operation registers the applicant's intent to apply for an open job
 * posting, attaches the associated resume (optional), assigns the initial
 * application status, and sets all timestamps to the current instant. Duplicate
 * submissions for the same applicant and job posting are rejected.
 *
 * Business constraints enforced:
 *
 * - Only authenticated, active applicants may apply.
 * - The target job posting must exist, be visible, not deleted, and not past its
 *   application deadline.
 * - If a resume is provided, it must exist, not be deleted, and belong to the
 *   applicant.
 * - At most one application per (applicant, job posting) is allowed.
 * - All status/timestamp fields are system-managed.
 *
 * @param props - Object with authenticated applicant context and application
 *   submission body.
 * @param props.applicant - Authenticated applicant JWT payload (ID and role).
 * @param props.body - Data specifying job posting and (optional) submitted
 *   resume.
 * @returns The newly created job application in detail for progress tracking.
 * @throws {Error} If the job posting does not exist, is not open for
 *   applications, or is deleted.
 * @throws {Error} If the application deadline has passed.
 * @throws {Error} If the resume is missing or not owned by this applicant.
 * @throws {Error} If a duplicate application exists for the applicant and
 *   posting.
 */
export async function postatsRecruitmentApplicantApplications(props: {
  applicant: ApplicantPayload;
  body: IAtsRecruitmentApplication.ICreate;
}): Promise<IAtsRecruitmentApplication> {
  const { applicant, body } = props;
  const defaultStatus = "submitted";
  // Fetch and validate job posting
  const posting = await MyGlobal.prisma.ats_recruitment_job_postings.findFirst({
    where: {
      id: body.job_posting_id,
      is_visible: true,
      deleted_at: null,
    },
    select: {
      id: true,
      application_deadline: true,
    },
  });
  if (!posting) {
    throw new Error(
      "Job posting does not exist, is not open for applications, or has been deleted.",
    );
  }
  if (
    posting.application_deadline !== null &&
    posting.application_deadline !== undefined &&
    new Date(posting.application_deadline).getTime() < Date.now()
  ) {
    throw new Error("The application period for this job posting has ended.");
  }
  // If resume provided, check it exists and belongs to applicant
  if (body.resume_id !== undefined && body.resume_id !== null) {
    const resume = await MyGlobal.prisma.ats_recruitment_resumes.findFirst({
      where: {
        id: body.resume_id,
        ats_recruitment_applicant_id: applicant.id,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (!resume) {
      throw new Error(
        "Resume does not exist, is deleted, or does not belong to this applicant.",
      );
    }
  }
  // System timestamps
  const now = toISOStringSafe(new Date());
  try {
    const created = await MyGlobal.prisma.ats_recruitment_applications.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        applicant_id: applicant.id,
        job_posting_id: body.job_posting_id,
        resume_id:
          body.resume_id !== undefined && body.resume_id !== null
            ? body.resume_id
            : undefined,
        current_status: defaultStatus,
        submitted_at: now,
        last_state_change_at: now,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    return {
      id: created.id,
      applicant_id: created.applicant_id,
      job_posting_id: created.job_posting_id,
      resume_id: created.resume_id ?? undefined,
      current_status: created.current_status,
      submitted_at: toISOStringSafe(created.submitted_at),
      last_state_change_at: toISOStringSafe(created.last_state_change_at),
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at !== null && created.deleted_at !== undefined
          ? toISOStringSafe(created.deleted_at)
          : undefined,
    };
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "P2002"
    ) {
      throw new Error(
        "Duplicate application: You have already applied to this job posting.",
      );
    }
    throw err;
  }
}
