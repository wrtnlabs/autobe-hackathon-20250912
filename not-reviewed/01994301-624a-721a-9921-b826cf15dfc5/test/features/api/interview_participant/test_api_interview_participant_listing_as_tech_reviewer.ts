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
 * E2E test to ensure a technical reviewer participant can view all participants
 * of their designated interview. This covers end-to-end workflow: tech reviewer
 * registration, HR recruiter and applicant registration, interview setup,
 * participant inviting, and listing access. Also tests: (a) tech reviewer not
 * assigned to an interview cannot access; (b) invalid interviewId fails; (c)
 * unauthorized request fails.
 */
export async function test_api_interview_participant_listing_as_tech_reviewer(
  connection: api.IConnection,
) {
  // 1. Register HR Recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = "HR_securePass1";
  const hr: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: hrEmail,
        password: hrPassword,
        name: RandomGenerator.name(),
        department: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(hr);
  // 2. Register Tech Reviewer
  const reviewerEmail = typia.random<string & tags.Format<"email">>();
  const reviewerPassword = "TR_reviewerPass1";
  const techReviewer: IAtsRecruitmentTechReviewer.IAuthorized =
    await api.functional.auth.techReviewer.join(connection, {
      body: {
        email: reviewerEmail,
        password: reviewerPassword,
        name: RandomGenerator.name(),
        specialization: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IAtsRecruitmentTechReviewer.ICreate,
    });
  typia.assert(techReviewer);
  // 3. Register Applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = "Applicant_Pass1";
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: applicantPassword,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IAtsRecruitmentApplicant.ICreate,
    });
  typia.assert(applicant);
  // 4. Applicant applies to a job (mock job posting ID)
  const jobPostingId = typia.random<string & tags.Format<"uuid">>();
  // login as applicant (to get token in connection)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const application: IAtsRecruitmentApplication =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPostingId,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);
  // login as HR
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  // 5. HR creates the interview
  const interview: IAtsRecruitmentInterview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          stage: "tech_round",
          status: "scheduled",
          notes: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interview);
  // 6. HR adds himself as participant
  const hrParticipant =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_hrrecruiter_id: hr.id,
          role: "recruiter",
          confirmation_status: "accepted",
        } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
      },
    );
  typia.assert(hrParticipant);
  // 7. HR adds applicant as participant
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
  // 8. HR adds tech reviewer as participant
  const reviewerParticipant =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_techreviewer_id: techReviewer.id,
          role: "reviewer",
          confirmation_status: "accepted",
        } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
      },
    );
  typia.assert(reviewerParticipant);
  // 9. Tech reviewer logs in
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });
  // 10. Tech reviewer lists participants
  const page: IPageIAtsRecruitmentInterviewParticipant =
    await api.functional.atsRecruitment.techReviewer.interviews.participants.index(
      connection,
      {
        interviewId: interview.id,
        body: {
          interviewId: interview.id,
        } satisfies IAtsRecruitmentInterviewParticipant.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "participants include all expected roles",
    page.data.some((p) => p.role === "applicant") &&
      page.data.some((p) => p.role === "recruiter") &&
      page.data.some((p) => p.role === "reviewer"),
  );
  TestValidator.equals(
    "applicant id matches",
    page.data.find((p) => p.role === "applicant")?.ats_recruitment_applicant_id,
    applicant.id,
  );
  TestValidator.equals(
    "hr id matches",
    page.data.find((p) => p.role === "recruiter")
      ?.ats_recruitment_hrrecruiter_id,
    hr.id,
  );
  TestValidator.equals(
    "tech reviewer id matches",
    page.data.find((p) => p.role === "reviewer")
      ?.ats_recruitment_techreviewer_id,
    techReviewer.id,
  );
  // 11. Negative: tech reviewer not assigned cannot access
  // Create a different interview without assigning tech reviewer
  const otherInterview: IAtsRecruitmentInterview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          stage: "hr",
          status: "scheduled",
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(otherInterview);
  // Do NOT add reviewer as participant for otherInterview
  await TestValidator.error(
    "tech reviewer not assigned cannot access",
    async () => {
      await api.functional.atsRecruitment.techReviewer.interviews.participants.index(
        connection,
        {
          interviewId: otherInterview.id,
          body: {
            interviewId: otherInterview.id,
          } satisfies IAtsRecruitmentInterviewParticipant.IRequest,
        },
      );
    },
  );
  // 12. Negative: random interviewId (invalid)
  const invalidInterviewId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("fails with invalid interviewId", async () => {
    await api.functional.atsRecruitment.techReviewer.interviews.participants.index(
      connection,
      {
        interviewId: invalidInterviewId,
        body: {
          interviewId: invalidInterviewId,
        } satisfies IAtsRecruitmentInterviewParticipant.IRequest,
      },
    );
  });
  // 13. Negative: unauthorized (no token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized with no token", async () => {
    await api.functional.atsRecruitment.techReviewer.interviews.participants.index(
      unauthConn,
      {
        interviewId: interview.id,
        body: {
          interviewId: interview.id,
        } satisfies IAtsRecruitmentInterviewParticipant.IRequest,
      },
    );
  });
}
