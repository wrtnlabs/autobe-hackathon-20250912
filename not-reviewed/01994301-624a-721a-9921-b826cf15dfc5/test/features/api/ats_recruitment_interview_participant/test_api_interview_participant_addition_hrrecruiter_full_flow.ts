import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewParticipant";
import type { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentApplicant";

export async function test_api_interview_participant_addition_hrrecruiter_full_flow(
  connection: api.IConnection,
) {
  // 1. Create and authenticate as HR recruiter
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiterPassword = "TestPassword1!";
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter);

  // 2. Create applicant account
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = "TestPassword2!";
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);

  // 3. Retrieve applicant using hrRecruiter capabilities
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const applicantsPage =
    await api.functional.atsRecruitment.hrRecruiter.applicants.index(
      connection,
      {
        body: {
          search: applicantEmail,
          is_active: true,
          limit: 1,
        } satisfies IAtsRecruitmentApplicant.IRequest,
      },
    );
  typia.assert(applicantsPage);
  TestValidator.predicate(
    "search returns at least one applicant",
    applicantsPage.data?.length > 0,
  );
  const foundApplicant = applicantsPage.data?.find(
    (a) => a.email === applicantEmail,
  );
  typia.assertGuard(foundApplicant!);

  // 4. Create job employment type
  const employmentType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          is_active: true,
        } satisfies IAtsRecruitmentJobEmploymentType.ICreate,
      },
    );
  typia.assert(employmentType);

  // 5. Create job posting state
  const stateCode = RandomGenerator.alphaNumeric(8);
  const jobPostingState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: stateCode,
          label: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_active: true,
          sort_order: 1,
        } satisfies IAtsRecruitmentJobPostingState.ICreate,
      },
    );
  typia.assert(jobPostingState);

  // 6. Create job posting
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter.id,
          job_employment_type_id: employmentType.id,
          job_posting_state_id: jobPostingState.id,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 10,
            sentenceMax: 20,
          }),
          location: RandomGenerator.paragraph({ sentences: 1 }),
          salary_range_min: 60000,
          salary_range_max: 100000,
          application_deadline: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 7. Log in as applicant, apply to job posting
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
          job_posting_id: jobPosting.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // 8. Switch back to HR and create interview
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
          title: "First Interview",
          stage: "first_phase",
          status: "scheduled",
          notes: null,
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interview);

  // 9. Add applicant as interview participant
  const participant =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_applicant_id: foundApplicant.id,
          role: "applicant",
          confirmation_status: "pending",
        } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
      },
    );
  typia.assert(participant);
  TestValidator.equals(
    "participant role should be applicant",
    participant.role,
    "applicant",
  );
  TestValidator.equals(
    "participant confirmation status should be pending",
    participant.confirmation_status,
    "pending",
  );
  TestValidator.equals(
    "participant links to correct interview",
    participant.ats_recruitment_interview_id,
    interview.id,
  );
  TestValidator.equals(
    "participant links to correct applicant",
    participant.ats_recruitment_applicant_id,
    foundApplicant.id,
  );

  // 10. Test duplicate addition error
  await TestValidator.error(
    "cannot add same applicant as participant twice",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
        connection,
        {
          interviewId: interview.id,
          body: {
            ats_recruitment_interview_id: interview.id,
            ats_recruitment_applicant_id: foundApplicant.id,
            role: "applicant",
            confirmation_status: "pending",
          } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
        },
      );
    },
  );

  // 11. Test wrong role value
  await TestValidator.error(
    "cannot add participant with invalid role (wrong-role)",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
        connection,
        {
          interviewId: interview.id,
          body: {
            ats_recruitment_interview_id: interview.id,
            ats_recruitment_applicant_id: foundApplicant.id,
            role: "wrong-role",
            confirmation_status: "pending",
          } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
        },
      );
    },
  );

  // 12. (If an option existed) test adding to closed interview, but our state management isn't accessible, so skip here.
}
