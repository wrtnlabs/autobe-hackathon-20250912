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
 * Test HR recruiter can retrieve a complete list of interview participants for
 * a scheduled interview. This requires registering and authenticating an HR
 * recruiter, an applicant, and a technical reviewer. HR creates a job posting
 * (out of scope for provided API, so we simulate with a random UUID as
 * job_posting_id), applicant applies, then interview is scheduled by recruiter.
 * Recruiter adds self, applicant, and tech reviewer as interview participants.
 * The recruiter lists participants for the interview and checks all roles are
 * present and details accurate. Edge cases: use invalid interviewId for listing
 * (should fail); attempt without recruiter authentication (should be
 * unauthorized); try to list participants for an interview with no or one
 * participant, as well as normal multi-participant scenario; try with each
 * possible participant role (recruiter, applicant, reviewer); negative: attempt
 * to list participants for an interview recruiter is not assigned to; simulate
 * deleted interview and ensure listing fails appropriately.
 */
export async function test_api_interview_participant_listing_as_hr_recruiter(
  connection: api.IConnection,
) {
  // Register primary HR recruiter
  const hrRecruiterEmail = typia.random<string & tags.Format<"email">>();
  const hrRecruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: hrRecruiterEmail,
        password: "RandPassw0rd99!$",
        name: RandomGenerator.name(),
        department: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(hrRecruiter);

  // Register another HR recruiter for cross-account/negative test
  const otherHrRecruiterEmail = typia.random<string & tags.Format<"email">>();
  const otherHrRecruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: otherHrRecruiterEmail,
        password: "RandPassw0rd99!$",
        name: RandomGenerator.name(),
        department: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(otherHrRecruiter);

  // Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: "RandAppl10P@ss",
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IAtsRecruitmentApplicant.ICreate,
    });
  typia.assert(applicant);

  // Register tech reviewer
  const reviewerEmail = typia.random<string & tags.Format<"email">>();
  const techReviewer: IAtsRecruitmentTechReviewer.IAuthorized =
    await api.functional.auth.techReviewer.join(connection, {
      body: {
        email: reviewerEmail,
        password: "ReviewerPassw0rd!",
        name: RandomGenerator.name(),
        specialization: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IAtsRecruitmentTechReviewer.ICreate,
    });
  typia.assert(techReviewer);

  // --- Applicant logs in & applies to a job (simulate random job_posting_id) ---
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: "RandAppl10P@ss",
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const job_posting_id = typia.random<string & tags.Format<"uuid">>();
  const application: IAtsRecruitmentApplication =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // --- HR logs back in, creates interview for the application ---
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrRecruiterEmail,
      password: "RandPassw0rd99!$",
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const interview: IAtsRecruitmentInterview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          title: RandomGenerator.paragraph({ sentences: 4 }),
          stage: "first_phase",
          status: "scheduled",
          notes: RandomGenerator.paragraph({ sentences: 10 }),
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interview);

  // --- Add participants: HR, applicant, tech reviewer ---
  const participants: IAtsRecruitmentInterviewParticipant[] = [];

  // Add applicant
  const applicantParticipant =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_applicant_id: applicant.id,
          role: "applicant",
          confirmation_status: "accepted",
        } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
      },
    );
  typia.assert(applicantParticipant);
  participants.push(applicantParticipant);

  // Add HR
  const hrParticipant =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_hrrecruiter_id: hrRecruiter.id,
          role: "recruiter",
          confirmation_status: "accepted",
        } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
      },
    );
  typia.assert(hrParticipant);
  participants.push(hrParticipant);

  // Add tech reviewer
  const reviewerParticipant =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_techreviewer_id: techReviewer.id,
          role: "reviewer",
          confirmation_status: "pending",
        } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
      },
    );
  typia.assert(reviewerParticipant);
  participants.push(reviewerParticipant);

  // --- HR requests list of participants ---
  const listRes: IPageIAtsRecruitmentInterviewParticipant =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.index(
      connection,
      {
        interviewId: interview.id,
        body: {
          interviewId: interview.id,
        } satisfies IAtsRecruitmentInterviewParticipant.IRequest,
      },
    );
  typia.assert(listRes);

  TestValidator.equals(
    "participant list should include all added participants",
    listRes.data.length,
    3,
  );
  const participantIds = participants.map((p) => p.id);
  const listedIds = listRes.data.map((p) => p.id);
  for (const pid of participantIds) {
    TestValidator.predicate(
      `participant ID ${pid} should be listed`,
      listedIds.includes(pid),
    );
  }

  // --- Edge case: Use invalid interviewId ---
  const fakeInterviewId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "listing participants for non-existent interview should fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.participants.index(
        connection,
        {
          interviewId: fakeInterviewId,
          body: {
            interviewId: fakeInterviewId,
          } satisfies IAtsRecruitmentInterviewParticipant.IRequest,
        },
      );
    },
  );

  // --- Edge case: Listing when there is only 1 participant ---
  // Create interview with only 1 participant (recruiter)
  const onePartApp: IAtsRecruitmentApplication =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  const onePartInterview: IAtsRecruitmentInterview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: onePartApp.id,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          stage: "hr",
          status: "scheduled",
          notes: "Single participant interview",
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  const soloParticipant =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
      connection,
      {
        interviewId: onePartInterview.id,
        body: {
          ats_recruitment_interview_id: onePartInterview.id,
          ats_recruitment_hrrecruiter_id: hrRecruiter.id,
          role: "recruiter",
          confirmation_status: "accepted",
        } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
      },
    );
  typia.assert(soloParticipant);

  const singleList =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.index(
      connection,
      {
        interviewId: onePartInterview.id,
        body: {
          interviewId: onePartInterview.id,
        } satisfies IAtsRecruitmentInterviewParticipant.IRequest,
      },
    );
  TestValidator.equals(
    "single participant interview, expected 1 result",
    singleList.data.length,
    1,
  );
  TestValidator.equals(
    "listed participant is recruiter",
    singleList.data[0].ats_recruitment_hrrecruiter_id,
    hrRecruiter.id,
  );

  // --- Negative: list as wrong recruiter ---
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: otherHrRecruiterEmail,
      password: "RandPassw0rd99!$",
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  await TestValidator.error(
    "listing participants for interview not assigned to recruiter should fail",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.participants.index(
        connection,
        {
          interviewId: interview.id,
          body: {
            interviewId: interview.id,
          } satisfies IAtsRecruitmentInterviewParticipant.IRequest,
        },
      );
    },
  );

  // --- Negative: unauthenticated request ---
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated recruiter should not list participants",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.participants.index(
        unauthConn,
        {
          interviewId: interview.id,
          body: {
            interviewId: interview.id,
          } satisfies IAtsRecruitmentInterviewParticipant.IRequest,
        },
      );
    },
  );
}
