import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewParticipant";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate that a technical reviewer can only view interview participant
 * details for interviews they are added to as a participant.
 *
 * 1. HR recruiter, applicant, and tech reviewer accounts are created and
 *    authenticated.
 * 2. HR creates a job posting and applicant applies.
 * 3. HR creates an interview and adds all actors as participants: applicant
 *    (role=applicant), themself (role=recruiter), tech reviewer
 *    (role=reviewer).
 * 4. Switch session to the tech reviewer.
 * 5. Tech reviewer fetches details for (a) applicant, (b) HR, (c) self — all
 *    should succeed and validate role fields.
 * 6. For edge/security: tech reviewer tries to fetch for a non-existent
 *    participantId and for a participantId from another interview (not
 *    granted), both should error (TestValidator.error expected).
 */
export async function test_api_tech_reviewer_participant_detail_visibility(
  connection: api.IConnection,
) {
  // 1. Register HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPwd = "P@ssw0rdHR1";
  const hr = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPwd,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hr);
  // 2. Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPwd = "P@ssw0rdAppl1";
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPwd,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);
  // 3. Register tech reviewer
  const reviewerEmail = typia.random<string & tags.Format<"email">>();
  const reviewerPwd = "P@ssw0rdRev1";
  const reviewer = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPwd,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentTechReviewer.ICreate,
  });
  typia.assert(reviewer);

  // 4. HR login
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPwd,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  // 5. HR creates job posting
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hr.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 6. Applicant login
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPwd,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  // 7. Applicant applies for job
  const application =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPosting.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // 8. HR login (again)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPwd,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 9. HR creates interview for the application
  const interview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          stage: "tech_round",
          status: "scheduled",
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interview);

  // 10a. HR adds applicant as participant
  const participant_applicant =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_applicant_id: applicant.id,
          role: "applicant",
          confirmation_status: "pending",
        } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
      },
    );
  typia.assert(participant_applicant);

  // 10b. HR adds HR as participant
  const participant_hr =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_hrrecruiter_id: hr.id,
          role: "recruiter",
          confirmation_status: "pending",
        } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
      },
    );
  typia.assert(participant_hr);

  // 10c. HR adds tech reviewer as participant
  const participant_reviewer =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_techreviewer_id: reviewer.id,
          role: "reviewer",
          confirmation_status: "pending",
        } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
      },
    );
  typia.assert(participant_reviewer);

  // 11. Tech reviewer login
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPwd,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });

  // 12a. Reviewer reads applicant participant details
  const got_applicant =
    await api.functional.atsRecruitment.techReviewer.interviews.participants.at(
      connection,
      {
        interviewId: interview.id,
        participantId: participant_applicant.id,
      },
    );
  typia.assert(got_applicant);
  TestValidator.equals(
    "role should be applicant",
    got_applicant.role,
    "applicant",
  );
  TestValidator.equals(
    "correct interview linkage for applicant",
    got_applicant.ats_recruitment_interview_id,
    interview.id,
  );
  TestValidator.equals(
    "applicant ID is retrievable",
    got_applicant.ats_recruitment_applicant_id,
    applicant.id,
  );

  // 12b. Reviewer reads HR participant details
  const got_hr =
    await api.functional.atsRecruitment.techReviewer.interviews.participants.at(
      connection,
      {
        interviewId: interview.id,
        participantId: participant_hr.id,
      },
    );
  typia.assert(got_hr);
  TestValidator.equals("role should be recruiter", got_hr.role, "recruiter");
  TestValidator.equals(
    "correct interview linkage for hr",
    got_hr.ats_recruitment_interview_id,
    interview.id,
  );
  TestValidator.equals(
    "recruiter ID is retrievable",
    got_hr.ats_recruitment_hrrecruiter_id,
    hr.id,
  );

  // 12c. Reviewer reads own reviewer participant details
  const got_review =
    await api.functional.atsRecruitment.techReviewer.interviews.participants.at(
      connection,
      {
        interviewId: interview.id,
        participantId: participant_reviewer.id,
      },
    );
  typia.assert(got_review);
  TestValidator.equals("role should be reviewer", got_review.role, "reviewer");
  TestValidator.equals(
    "correct interview linkage for reviewer",
    got_review.ats_recruitment_interview_id,
    interview.id,
  );
  TestValidator.equals(
    "reviewer ID is retrievable",
    got_review.ats_recruitment_techreviewer_id,
    reviewer.id,
  );

  // 13. Edge/security: attempt with invalid participantId
  const invalidParticipantId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "error on invalid participantId lookup",
    async () => {
      await api.functional.atsRecruitment.techReviewer.interviews.participants.at(
        connection,
        {
          interviewId: interview.id,
          participantId: invalidParticipantId,
        },
      );
    },
  );
  // 14. Edge/security: attempt for another interview
  // HR creates new interview, reviewer NOT assigned
  const interview2 =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          stage: "hr",
          status: "scheduled",
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interview2);
  // Add only applicant as participant
  const participant_applicant2 =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
      connection,
      {
        interviewId: interview2.id,
        body: {
          ats_recruitment_interview_id: interview2.id,
          ats_recruitment_applicant_id: applicant.id,
          role: "applicant",
          confirmation_status: "pending",
        } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
      },
    );
  typia.assert(participant_applicant2);
  // Reviewer tries to fetch participant in interview2 (should get error)
  await TestValidator.error(
    "tech reviewer not permitted for unrelated interview participant",
    async () => {
      await api.functional.atsRecruitment.techReviewer.interviews.participants.at(
        connection,
        {
          interviewId: interview2.id,
          participantId: participant_applicant2.id,
        },
      );
    },
  );
}
