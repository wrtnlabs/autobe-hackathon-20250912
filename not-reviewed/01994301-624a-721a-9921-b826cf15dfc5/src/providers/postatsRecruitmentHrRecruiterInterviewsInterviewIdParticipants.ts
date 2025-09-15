import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewParticipant";
import { HrrecruiterPayload } from "../decorators/payload/HrrecruiterPayload";

/**
 * Add a participant (applicant, HR recruiter, tech reviewer, observer) to an
 * interview session.
 *
 * This operation allows an HR recruiter to invite an actor as a participant in
 * a specific interview. The recruiter must own the interview, and the
 * participant role must be valid (applicant/recruiter/reviewer/observer).
 * Timestamps are registered for audit and confirmation status is set according
 * to business rules. Duplicate addition is prevented by the database
 * constraint, and input is strictly verified.
 *
 * @param props - Request properties
 * @param props.hrRecruiter - Authenticated HR recruiter (must own interview)
 * @param props.interviewId - UUID of the interview for which to add a
 *   participant
 * @param props.body - Details about the invited participant (role, references,
 *   confirmation_status)
 * @returns Newly created IAtsRecruitmentInterviewParticipant object, with all
 *   audit fields
 * @throws {Error} If the interview does not exist/accessible, invalid role, or
 *   participant already exists
 */
export async function postatsRecruitmentHrRecruiterInterviewsInterviewIdParticipants(props: {
  hrRecruiter: HrrecruiterPayload;
  interviewId: string & tags.Format<"uuid">;
  body: IAtsRecruitmentInterviewParticipant.ICreate;
}): Promise<IAtsRecruitmentInterviewParticipant> {
  // Step 1: Check interview ownership and existence
  const interview = await MyGlobal.prisma.ats_recruitment_interviews.findFirst({
    where: {
      id: props.interviewId,
      hr_recruiter_id: props.hrRecruiter.id,
    },
  });
  if (!interview) {
    throw new Error(
      "Interview not found or not accessible by this HR recruiter",
    );
  }

  // Step 2: Business role validation
  const allowedRoles = ["applicant", "recruiter", "reviewer", "observer"];
  if (!allowedRoles.includes(props.body.role)) {
    throw new Error(
      "Invalid role for participant; must be one of: applicant, recruiter, reviewer, observer",
    );
  }

  // Step 3: Prepare timestamps
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Step 4: Attempt participant creation (enforces unique constraint)
  let created;
  try {
    created =
      await MyGlobal.prisma.ats_recruitment_interview_participants.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          ats_recruitment_interview_id: props.interviewId,
          ats_recruitment_applicant_id:
            props.body.ats_recruitment_applicant_id ?? null,
          ats_recruitment_hrrecruiter_id:
            props.body.ats_recruitment_hrrecruiter_id ?? null,
          ats_recruitment_techreviewer_id:
            props.body.ats_recruitment_techreviewer_id ?? null,
          role: props.body.role,
          invited_at: now,
          confirmation_status: props.body.confirmation_status,
          created_at: now,
        },
      });
  } catch (err) {
    throw new Error(
      "Failed to create interview participant; likely already exists.",
    );
  }

  // Step 5: Build response: map all fields to DTO
  return {
    id: created.id,
    ats_recruitment_interview_id: created.ats_recruitment_interview_id,
    ats_recruitment_applicant_id:
      created.ats_recruitment_applicant_id ?? undefined,
    ats_recruitment_hrrecruiter_id:
      created.ats_recruitment_hrrecruiter_id ?? undefined,
    ats_recruitment_techreviewer_id:
      created.ats_recruitment_techreviewer_id ?? undefined,
    role: created.role,
    invited_at: created.invited_at,
    confirmation_status: created.confirmation_status,
    created_at: created.created_at,
  };
}
