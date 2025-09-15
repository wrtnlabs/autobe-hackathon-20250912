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
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentHrRecruiter";
import type { IPageIAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentTechReviewer";

/**
 * E2E test for flow: system admin adds all types of participants to interview.
 *
 * 1. Register systemAdmin and log in
 * 2. Register an applicant and log in
 * 3. Back to systemAdmin authentication
 * 4. Query at least one HR recruiter and one tech reviewer (or create if none?)
 * 5. Create a job employment type
 * 6. Create a job posting state
 * 7. Create a job posting with systemAdmin, assign to HR recruiter
 * 8. Switch back to applicant, apply for this job posting
 * 9. Switch back to systemAdmin, create an interview for this application
 * 10. As systemAdmin, add applicant as participant to the interview
 * 11. As systemAdmin, add HR recruiter as participant (different role)
 * 12. As systemAdmin, add tech reviewer as participant
 * 13. Try to add duplicate participant (should error)
 * 14. Try to add participant to non-existent interview (should error)
 */
export async function test_api_interview_participant_addition_systemadmin_full_flow(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const sysAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword: string = RandomGenerator.alphaNumeric(12);
  const sysAdmin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysAdminEmail,
        password: sysAdminPassword,
        name: RandomGenerator.name(),
        super_admin: true,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(sysAdmin);

  // 2. Register applicant
  const applicantEmail: string = typia.random<string & tags.Format<"email">>();
  const applicantPassword: string = RandomGenerator.alphaNumeric(10) + "!A";
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

  // 3. (simulate role switch) Re-login as systemAdmin
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });

  // 4. Ensure/obtain HR recruiter and tech reviewer
  // HR
  const hrRecruiterList =
    await api.functional.atsRecruitment.systemAdmin.hrRecruiters.index(
      connection,
      {
        body: {} satisfies IAtsRecruitmentHrRecruiter.IRequest,
      },
    );
  typia.assert(hrRecruiterList);
  const hrRecruiters = hrRecruiterList.data;
  TestValidator.predicate(
    "must have at least one HR recruiter",
    hrRecruiters.length > 0,
  );
  const hrRecruiter = hrRecruiters[0];

  // Tech reviewer
  const techReviewerList =
    await api.functional.atsRecruitment.systemAdmin.techReviewers.index(
      connection,
      {
        body: {} satisfies IAtsRecruitmentTechReviewer.IRequest,
      },
    );
  typia.assert(techReviewerList);
  const techReviewers = techReviewerList.data;
  TestValidator.predicate(
    "must have at least one tech reviewer",
    techReviewers.length > 0,
  );
  const techReviewer = techReviewers[0];

  // 5. Create job employment type
  const employmentType =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph(),
          is_active: true,
        } satisfies IAtsRecruitmentJobEmploymentType.ICreate,
      },
    );
  typia.assert(employmentType);

  // 6. Create job posting state
  const postingState =
    await api.functional.atsRecruitment.systemAdmin.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: RandomGenerator.alphabets(6),
          label: RandomGenerator.name(2),
          description: RandomGenerator.paragraph(),
          is_active: true,
          sort_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IAtsRecruitmentJobPostingState.ICreate,
      },
    );
  typia.assert(postingState);

  // 7. Create a job posting
  const jobPosting =
    await api.functional.atsRecruitment.systemAdmin.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrRecruiter.id,
          job_employment_type_id: employmentType.id,
          job_posting_state_id: postingState.id,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 8. Applicant log in, apply for this job posting
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

  // 9. Back to systemAdmin auth, create interview for application
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });
  const interview =
    await api.functional.atsRecruitment.systemAdmin.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          title: RandomGenerator.name(3),
          stage: "tech_round",
          status: "scheduled",
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interview);

  // 10-12. Add participants: applicant, hr recruiter, tech reviewer
  // Add applicant
  const applicantParticipant =
    await api.functional.atsRecruitment.systemAdmin.interviews.participants.create(
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
  TestValidator.equals(
    "applicant participant role",
    applicantParticipant.role,
    "applicant",
  );

  // Add HR recruiter
  const hrParticipant =
    await api.functional.atsRecruitment.systemAdmin.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_hrrecruiter_id: hrRecruiter.id,
          role: "hr_recruiter",
          confirmation_status: "pending",
        } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
      },
    );
  typia.assert(hrParticipant);
  TestValidator.equals(
    "hr recruiter participant role",
    hrParticipant.role,
    "hr_recruiter",
  );

  // Add tech reviewer
  const techParticipant =
    await api.functional.atsRecruitment.systemAdmin.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_techreviewer_id: techReviewer.id,
          role: "tech_reviewer",
          confirmation_status: "pending",
        } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
      },
    );
  typia.assert(techParticipant);
  TestValidator.equals(
    "tech reviewer participant role",
    techParticipant.role,
    "tech_reviewer",
  );

  // 13. Try adding duplicate (applicant) -- should error
  await TestValidator.error(
    "duplicate applicant as participant should error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.participants.create(
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
    },
  );

  // 14. Try adding participant to non-existent interview
  await TestValidator.error(
    "add participant to non-existent interview should error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.participants.create(
        connection,
        {
          interviewId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            ats_recruitment_interview_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            ats_recruitment_hrrecruiter_id: hrRecruiter.id,
            role: "hr_recruiter",
            confirmation_status: "pending",
          } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
        },
      );
    },
  );
}
