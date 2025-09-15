import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewParticipant";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentInterviewParticipant";

/**
 * This test validates that a system administrator can retrieve the full
 * participant list for any interview in the system using the admin API.
 *
 * Scenario steps:
 *
 * 1. Register a system administrator account and log in.
 * 2. Register applicant, hr recruiter, and tech reviewer accounts.
 * 3. HR recruiter creates a simulated jobPostingId; applicant applies and creates
 *    an application.
 * 4. HR recruiter creates an interview for the application.
 * 5. HR recruiter adds applicant, hr recruiter, and tech reviewer as participants.
 * 6. System admin logs in and queries the full list of participants for the
 *    interview, checking their presence and count.
 * 7. Edge cases: query non-existent interview as admin (should error),
 *    unauthorized context fetch by applicant (should error).
 *
 * Success criteria: admin retrieves all legitimate participants; error cases
 * trigger error as designed.
 */
export async function test_api_interview_participant_listing_as_admin(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      super_admin: true,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register applicant, hr recruiter, tech reviewer
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);

  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter);

  const reviewerEmail = typia.random<string & tags.Format<"email">>();
  const reviewerPassword = RandomGenerator.alphaNumeric(12);
  const techReviewer = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: reviewerEmail,
      password: reviewerPassword,
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentTechReviewer.ICreate,
  });
  typia.assert(techReviewer);

  // 3. Switch to HR recruiter - create a simulated jobPostingId
  const jobPostingId = typia.random<string & tags.Format<"uuid">>();

  // 4. Switch to applicant - create application for job posting
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  const application =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPostingId,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // 5. Switch to HR recruiter
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 6. HR recruiter creates interview
  const interview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          stage: "first_phase",
          status: "scheduled",
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interview);

  // 7. HR recruiter adds all roles as participants
  // Applicant participant
  const applicantParticipant =
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
  typia.assert(applicantParticipant);

  // HR recruiter participant
  const hrParticipant =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_hrrecruiter_id: hrRecruiter.id,
          role: "recruiter",
          confirmation_status: "pending",
        } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
      },
    );
  typia.assert(hrParticipant);

  // Tech reviewer participant
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

  // 8. Switch to system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });

  // 9. Admin retrieves participant list for the interview
  const participantsPage =
    await api.functional.atsRecruitment.systemAdmin.interviews.participants.index(
      connection,
      {
        interviewId: interview.id,
        body: {
          interviewId: interview.id,
        } satisfies IAtsRecruitmentInterviewParticipant.IRequest,
      },
    );
  typia.assert(participantsPage);
  TestValidator.equals(
    "admin gets all participants",
    participantsPage.pagination.records,
    3,
  );
  const fetchedIds = participantsPage.data.map((p) => p.id);
  TestValidator.predicate(
    "participant ids contain all expected",
    fetchedIds.includes(applicantParticipant.id) &&
      fetchedIds.includes(hrParticipant.id) &&
      fetchedIds.includes(reviewerParticipant.id),
  );

  // 10. Edge case: non-existent interview
  const fakeInterviewId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent interview id should not succeed",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.participants.index(
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

  // 11. Edge case: unauthorized role fetch
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error(
    "applicant cannot list participants as admin",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.participants.index(
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
}
