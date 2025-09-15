import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewParticipant";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentInterviewParticipant";

/**
 * Validate applicant participant listing for an interview.
 *
 * Steps:
 *
 * 1. Register applicant, recruiter, and reviewer accounts (with email & password)
 * 2. Applicant login (acquire JWT)
 * 3. Recruiter and reviewer login (for participant creation)
 * 4. Applicant creates a job application (requires valid job_posting_id; use
 *    random uuid)
 * 5. Recruiter creates an interview for the application
 * 6. Recruiter adds applicant and reviewer as participants in the interview
 * 7. Applicant logs in, lists interview participants; the returned response should
 *    contain all participant roles, correct IDs, and expected role strings
 * 8. Edge case: Try listing with a random invalid interviewId; check error
 * 9. Edge case: Try listing without login (clear headers); check error
 * 10. Edge case: another applicant tries to fetch this interview's participants
 *     (should fail)
 */
export async function test_api_interview_participant_listing_as_applicant(
  connection: api.IConnection,
) {
  // Step 1: Register applicant, recruiter, reviewer
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(10);
  const applicantJoin = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicantJoin);
  const applicantId = applicantJoin.id;

  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiterPassword = RandomGenerator.alphaNumeric(10);
  const recruiterJoin = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
      name: RandomGenerator.name(2),
      department: RandomGenerator.name(1),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiterJoin);
  const recruiterId = recruiterJoin.id;

  const reviewerEmail = typia.random<string & tags.Format<"email">>();
  const reviewerPassword = RandomGenerator.alphaNumeric(10);
  const reviewerJoin = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
      name: RandomGenerator.name(2),
      specialization: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IAtsRecruitmentTechReviewer.ICreate,
  });
  typia.assert(reviewerJoin);
  const reviewerId = reviewerJoin.id;

  // Step 2. Applicant login
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // Step 3. Recruiter & Reviewer login (for later context switching)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });

  // Switch back to applicant for application creation
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // Step 4. Applicant creates a job application
  const jobPostingId = typia.random<string & tags.Format<"uuid">>();
  const application =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPostingId,
          resume_id: null,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // Step 5. Recruiter creates interview for application
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const interview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          stage: "first_phase",
          status: "scheduled",
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interview);
  const interviewId = interview.id;

  // Step 6. Recruiter adds applicant & reviewer as participants
  // Add applicant participant
  const applicantPart =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
      connection,
      {
        interviewId,
        body: {
          ats_recruitment_interview_id: interviewId,
          ats_recruitment_applicant_id: applicantId,
          role: "applicant",
          confirmation_status: "pending",
        } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
      },
    );
  typia.assert(applicantPart);
  // Add reviewer participant
  const reviewerPart =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
      connection,
      {
        interviewId,
        body: {
          ats_recruitment_interview_id: interviewId,
          ats_recruitment_techreviewer_id: reviewerId,
          role: "reviewer",
          confirmation_status: "pending",
        } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
      },
    );
  typia.assert(reviewerPart);

  // Step 7. Applicant logs in and lists interview participants
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const response =
    await api.functional.atsRecruitment.applicant.interviews.participants.index(
      connection,
      {
        interviewId: interviewId,
        body: {
          interviewId: interviewId,
        } satisfies IAtsRecruitmentInterviewParticipant.IRequest,
      },
    );
  typia.assert(response);
  // Confirm all expected roles are present (applicant, reviewer), correct IDs
  const roles = response.data.map((p) => p.role);
  TestValidator.predicate(
    "contains applicant role",
    roles.includes("applicant"),
  );
  TestValidator.predicate("contains reviewer role", roles.includes("reviewer"));
  // Check IDs
  const applicantParticipant = response.data.find(
    (p) => p.role === "applicant",
  );
  TestValidator.equals(
    "applicant ID match",
    applicantParticipant?.ats_recruitment_applicant_id,
    applicantId,
  );
  const reviewerParticipant = response.data.find((p) => p.role === "reviewer");
  TestValidator.equals(
    "reviewer ID match",
    reviewerParticipant?.ats_recruitment_techreviewer_id,
    reviewerId,
  );

  // Step 8. Edge case: invalid interviewId
  await TestValidator.error("invalid interviewId must fail", async () => {
    await api.functional.atsRecruitment.applicant.interviews.participants.index(
      connection,
      {
        interviewId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          interviewId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IAtsRecruitmentInterviewParticipant.IRequest,
      },
    );
  });

  // Step 9. Edge case: unauthenticated access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access should fail", async () => {
    await api.functional.atsRecruitment.applicant.interviews.participants.index(
      unauthConn,
      {
        interviewId: interviewId,
        body: {
          interviewId: interviewId,
        } satisfies IAtsRecruitmentInterviewParticipant.IRequest,
      },
    );
  });

  // Step 10. Edge case: wrong applicant (should not access participant list)
  // Register & login as a second applicant
  const badApplicantEmail = typia.random<string & tags.Format<"email">>();
  const badApplicantPassword = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.applicant.join(connection, {
    body: {
      email: badApplicantEmail,
      password: badApplicantPassword,
      name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: badApplicantEmail,
      password: badApplicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error(
    "another applicant cannot access participants",
    async () => {
      await api.functional.atsRecruitment.applicant.interviews.participants.index(
        connection,
        {
          interviewId: interviewId,
          body: {
            interviewId: interviewId,
          } satisfies IAtsRecruitmentInterviewParticipant.IRequest,
        },
      );
    },
  );
}
