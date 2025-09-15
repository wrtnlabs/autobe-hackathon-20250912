import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewSchedule";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test the deletion of an interview schedule slot by an HR recruiter after
 * complete business flow setup.
 *
 * Scenario steps:
 *
 * 1. Register a new HR recruiter and applicant with unique credentials (simulate
 *    both actors).
 * 2. HR recruiter creates a job posting.
 * 3. Applicant applies for the posted job.
 * 4. HR recruiter creates an interview for the application.
 * 5. HR recruiter adds a schedule slot to the interview.
 * 6. HR recruiter deletes the schedule slot using the endpoint under test.
 * 7. Attempt to delete the schedule slot again (should fail due to non-existence,
 *    edge case test).
 * 8. Attempt to delete the slot as an applicant after switching roles (should fail
 *    due to lack of authorization).
 *
 * Audit logging and calendar sync status are not directly testable via this API
 * surface, so these are only described, not validated directly.
 *
 * The scenario ensures correct behavior under normal and edge conditions and
 * validates that business logic and authorization are enforced.
 */
export async function test_api_interview_schedule_slot_deletion_with_synchronization_and_audit(
  connection: api.IConnection,
) {
  // 1. HR Recruiter registers and logs in
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiterPassword = RandomGenerator.alphaNumeric(12);
  const recruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: recruiterEmail,
        password: recruiterPassword,
        name: RandomGenerator.name(),
        department: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(recruiter);

  // 2. Applicant registers and logs in
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
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

  // 3. HR Recruiter creates a job posting
  const jobPosting: IAtsRecruitmentJobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: recruiter.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          location: "Seoul, Korea",
          salary_range_min: 50000,
          salary_range_max: 90000,
          application_deadline: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 4. Applicant logs in (simulate switching to applicant user context)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // 5. Applicant applies for job
  const application: IAtsRecruitmentApplication =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPosting.id,
        } satisfies IAtsRecruitmentApplication.ICreate,
      },
    );
  typia.assert(application);

  // 6. HR logs in (switch context back to HR)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 7. HR schedules interview for application
  const interview: IAtsRecruitmentInterview =
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

  // 8. HR adds a schedule slot
  const scheduleSlot: IAtsRecruitmentInterviewSchedule =
    await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          start_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          end_at: new Date(Date.now() + 1000 * 60 * 60 * 26).toISOString(),
          timezone: "Asia/Seoul",
          schedule_source: "manual",
          schedule_status: "proposed",
          cancellation_reason: null,
        } satisfies IAtsRecruitmentInterviewSchedule.ICreate,
      },
    );
  typia.assert(scheduleSlot);

  // 9. HR deletes the schedule slot
  await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.erase(
    connection,
    {
      interviewId: interview.id,
      scheduleId: scheduleSlot.id,
    },
  );

  // 10. Try to delete again (should fail)
  await TestValidator.error(
    "should fail deleting already deleted schedule slot",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.erase(
        connection,
        {
          interviewId: interview.id,
          scheduleId: scheduleSlot.id,
        },
      );
    },
  );

  // 11. Try to delete without recruiter auth (after logging in as applicant)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error(
    "should reject schedule deletion by applicant",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.erase(
        connection,
        {
          interviewId: interview.id,
          scheduleId: scheduleSlot.id,
        },
      );
    },
  );
}
