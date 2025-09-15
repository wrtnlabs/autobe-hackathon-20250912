import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewParticipant";
import type { IAtsRecruitmentJobEmploymentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobEmploymentType";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentJobPostingState } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPostingState";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Full E2E test scenario for updating a participant in an interview as
 * systemAdmin. Covers: systemAdmin/applicant authentication, all data setup
 * (job posting prerequisites), application creation, interview and participant
 * creation, and participant update with success and error (edge) case checks.
 */
export async function test_api_interview_participant_update_systemadmin_full_e2e(
  connection: api.IConnection,
) {
  // 1. Register and login systemAdmin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdminName = RandomGenerator.name();
  const sysAdmin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: sysAdminEmail,
        password: sysAdminPassword,
        name: sysAdminName,
        super_admin: false,
      },
    });
  typia.assert(sysAdmin);

  // 2. Register and login applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicantName = RandomGenerator.name();
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: applicantPassword,
        name: applicantName,
      },
    });
  typia.assert(applicant);

  // 3. Create job employment type
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      password: sysAdminPassword,
    },
  });
  const employmentType =
    await api.functional.atsRecruitment.systemAdmin.jobEmploymentTypes.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          is_active: true,
        },
      },
    );
  typia.assert(employmentType);

  // 4. Create job posting state
  const postingState =
    await api.functional.atsRecruitment.systemAdmin.jobPostingStates.create(
      connection,
      {
        body: {
          state_code: RandomGenerator.alphaNumeric(8),
          label: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_active: true,
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
          >() satisfies number as number,
        },
      },
    );
  typia.assert(postingState);

  // 5. Create job posting
  const jobPosting =
    await api.functional.atsRecruitment.systemAdmin.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: sysAdmin.id,
          job_employment_type_id: employmentType.id,
          job_posting_state_id: postingState.id,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 10 }),
          location: RandomGenerator.paragraph({ sentences: 2 }),
          salary_range_min: 1000,
          salary_range_max: 2000,
          application_deadline: new Date(
            Date.now() + 7 * 24 * 3600 * 1000,
          ).toISOString(),
          is_visible: true,
        },
      },
    );
  typia.assert(jobPosting);

  // 6. Applicant applies for the job posting
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    },
  });
  const application =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPosting.id,
        },
      },
    );
  typia.assert(application);

  // 7. System admin login again for next operations
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      password: sysAdminPassword,
    },
  });

  // 8. Create interview
  const interview =
    await api.functional.atsRecruitment.systemAdmin.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          stage: "first_phase",
          status: "scheduled",
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(interview);

  // 9. Add participant to interview
  const participant =
    await api.functional.atsRecruitment.systemAdmin.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_applicant_id: applicant.id,
          role: "applicant",
          confirmation_status: "pending",
        },
      },
    );
  typia.assert(participant);

  // 10. Update participant: change confirmation_status
  const updatedParticipant =
    await api.functional.atsRecruitment.systemAdmin.interviews.participants.update(
      connection,
      {
        interviewId: interview.id,
        participantId: participant.id,
        body: {
          confirmation_status: "accepted",
        },
      },
    );
  typia.assert(updatedParticipant);
  TestValidator.equals(
    "participant confirmation_status updated",
    updatedParticipant.confirmation_status,
    "accepted",
  );
  TestValidator.equals(
    "participant role not changed",
    updatedParticipant.role,
    participant.role,
  );

  // 11. Attempt forbidden update: role to invalid value
  await TestValidator.error(
    "should reject update with invalid role",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.participants.update(
        connection,
        {
          interviewId: interview.id,
          participantId: participant.id,
          body: {
            role: "invalid_role_value",
          },
        },
      );
    },
  );

  // 12. Edge case: update participant in deleted interview (simulate)
  // Since there is no delete API, simulate by changing reference
  await TestValidator.error(
    "should reject update for participant on non-existent interviewId",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.participants.update(
        connection,
        {
          interviewId: typia.random<string & tags.Format<"uuid">>(),
          participantId: participant.id,
          body: {
            confirmation_status: "declined",
          },
        },
      );
    },
  );
}
