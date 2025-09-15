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

/**
 * E2E business flow for updating an interview participant as HR recruiter.
 *
 * Validates workflow of participant modification and permission boundaries.
 * Steps:
 *
 * 1. Register random HR recruiter and applicant; store credentials for role
 *    switch.
 * 2. HR recruiter logs in; creates job employment type, job posting state.
 * 3. HR recruiter creates job posting referencing employment type and state.
 * 4. Switch to applicant: register, login and apply to job posting.
 * 5. Switch to HR recruiter: create interview referencing applicant's application.
 * 6. HR recruiter adds applicant as a participant (role: 'applicant',
 *    confirmation_status: 'pending').
 * 7. HR recruiter updates participant status to 'accepted'.
 *
 *    - Assert confirmation_status updated.
 * 8. HR recruiter changes role to 'reviewer'.
 *
 *    - Assert role updated.
 * 9. Try error scenario: update random/fake participant id (should throw; assert
 *    error thrown).
 */
export async function test_api_interview_participant_update_hrrecruiter_business_flow(
  connection: api.IConnection,
) {
  // Generate HR recruiter credentials
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);
  const hrName = RandomGenerator.name();

  // HR recruiter registration
  const hrAuth = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: hrName,
      department: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrAuth);
  TestValidator.equals(
    "HR recruiter registration: email matches",
    hrAuth.email,
    hrEmail,
  );
  TestValidator.equals(
    "HR recruiter registration: name matches",
    hrAuth.name,
    hrName,
  );

  // Create job employment type
  const jobEmploymentType =
    await api.functional.atsRecruitment.hrRecruiter.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_active: true,
        } satisfies IAtsRecruitmentJobEmploymentType.ICreate,
      },
    );
  typia.assert(jobEmploymentType);

  // Create job posting state
  const jobPostingState =
    await api.functional.atsRecruitment.hrRecruiter.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: RandomGenerator.alphaNumeric(8),
          label: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          is_active: true,
          sort_order: 1,
        } satisfies IAtsRecruitmentJobPostingState.ICreate,
      },
    );
  typia.assert(jobPostingState);

  // Create job posting
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: hrAuth.id,
          job_employment_type_id: jobEmploymentType.id,
          job_posting_state_id: jobPostingState.id,
          title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 6 }),
          location: RandomGenerator.paragraph({ sentences: 2 }),
          salary_range_min: 60000,
          salary_range_max: 120000,
          application_deadline: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // Generate Applicant credentials
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicantName = RandomGenerator.name();
  const applicantPhone = RandomGenerator.mobile();

  // Applicant registration
  const applicantAuth = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: applicantName,
      phone: applicantPhone,
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicantAuth);

  // Applicant login to get token set
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // Applicant applies to job posting
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

  // Switch role back to HR recruiter
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // Create interview for the new application (HR recruiter)
  const interview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          stage: "first_phase",
          status: "scheduled",
          notes: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interview);

  // HR recruiter adds the applicant as a participant to the interview
  const participantCreate =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_applicant_id: applicantAuth.id,
          role: "applicant",
          confirmation_status: "pending",
        } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
      },
    );
  typia.assert(participantCreate);
  TestValidator.equals(
    "participant role after creation",
    participantCreate.role,
    "applicant",
  );
  TestValidator.equals(
    "participant status after creation",
    participantCreate.confirmation_status,
    "pending",
  );

  // HR recruiter updates the participant's confirmation status to accepted
  const participantUpdate1 =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.update(
      connection,
      {
        interviewId: interview.id,
        participantId: participantCreate.id,
        body: {
          confirmation_status: "accepted",
        } satisfies IAtsRecruitmentInterviewParticipant.IUpdate,
      },
    );
  typia.assert(participantUpdate1);
  TestValidator.equals(
    "participant confirmation_status updated to accepted",
    participantUpdate1.confirmation_status,
    "accepted",
  );
  TestValidator.equals(
    "participant role remains applicant after status update",
    participantUpdate1.role,
    "applicant",
  );

  // HR recruiter updates the participant's role to reviewer
  const participantUpdate2 =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.update(
      connection,
      {
        interviewId: interview.id,
        participantId: participantCreate.id,
        body: {
          role: "reviewer",
        } satisfies IAtsRecruitmentInterviewParticipant.IUpdate,
      },
    );
  typia.assert(participantUpdate2);
  TestValidator.equals(
    "participant role updated to reviewer",
    participantUpdate2.role,
    "reviewer",
  );
  TestValidator.equals(
    "participant confirmation_status remains after role update",
    participantUpdate2.confirmation_status,
    participantUpdate1.confirmation_status,
  );

  // Negative scenario: Update a non-existent participant (should throw error)
  await TestValidator.error(
    "updating a non-existent participant should error",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.participants.update(
        connection,
        {
          interviewId: interview.id,
          participantId: typia.random<string & tags.Format<"uuid">>(), // likely non-existent
          body: {
            confirmation_status: "declined",
          } satisfies IAtsRecruitmentInterviewParticipant.IUpdate,
        },
      );
    },
  );
}
