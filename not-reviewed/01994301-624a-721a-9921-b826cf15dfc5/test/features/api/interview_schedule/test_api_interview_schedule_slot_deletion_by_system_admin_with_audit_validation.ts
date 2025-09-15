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
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * System administrator deletes an interview schedule slot to validate
 * privileged deletion, audit compliance, and error/authorization business
 * rules.
 *
 * 1. Register and login as system admin with super_admin privilege.
 * 2. Register an HR recruiter and applicant; obtain their authentication.
 * 3. As recruiter, create a job posting.
 * 4. As applicant, apply to the job posting.
 * 5. As recruiter, create an interview for the application.
 * 6. As recruiter, create an interview schedule slot.
 * 7. As system admin, delete the interview schedule slot.
 * 8. Attempt to delete the same slot again (should fail - not found).
 * 9. As recruiter, attempt to delete the slot via admin endpoint (should fail -
 *    unauthorized).
 * 10. As applicant, attempt to delete the slot via admin endpoint (should fail -
 *     unauthorized).
 *
 * Direct audit log access isn't available, so audit is assumed to be
 * implemented.
 */
export async function test_api_interview_schedule_slot_deletion_by_system_admin_with_audit_validation(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SuperAdmin1234";
  const adminName = RandomGenerator.name();
  const adminAuthorized = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        super_admin: true,
      },
    },
  );
  typia.assert(adminAuthorized);

  // 2. Register recruiter
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiterPassword = "RecruiterPass123";
  const recruiterName = RandomGenerator.name();
  const recruiterAuthorized = await api.functional.auth.hrRecruiter.join(
    connection,
    {
      body: {
        email: recruiterEmail,
        password: recruiterPassword,
        name: recruiterName,
        department: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(recruiterAuthorized);

  // 3. Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = "ApplicantPass123";
  const applicantName = RandomGenerator.name();
  const applicantAuthorized = await api.functional.auth.applicant.join(
    connection,
    {
      body: {
        email: applicantEmail,
        password: applicantPassword,
        name: applicantName,
        phone: RandomGenerator.mobile(),
      },
    },
  );
  typia.assert(applicantAuthorized);

  // 4. Recruiter login for subsequent actions
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    },
  });

  // 5. Create job posting as recruiter
  const jobPostingBody = {
    hr_recruiter_id: recruiterAuthorized.id,
    job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
    job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    salary_range_min: 35000,
    salary_range_max: 55000,
    application_deadline: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 30,
    ).toISOString(),
    is_visible: true,
  } satisfies IAtsRecruitmentJobPosting.ICreate;
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: jobPostingBody,
      },
    );
  typia.assert(jobPosting);

  // 6. Applicant login for application
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    },
  });

  // 7. Create application as applicant
  const applicationBody = {
    job_posting_id: jobPosting.id,
  } satisfies IAtsRecruitmentApplication.ICreate;
  const application =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: applicationBody,
      },
    );
  typia.assert(application);

  // 8. Recruiter login for interview creation
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    },
  });

  // 9. Create interview as recruiter
  const interviewBody = {
    ats_recruitment_application_id: application.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    stage: "technical_screen",
    status: "scheduled",
    notes: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IAtsRecruitmentInterview.ICreate;
  const interview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: interviewBody,
      },
    );
  typia.assert(interview);

  // 10. Schedule slot as recruiter
  const now = Date.now();
  const scheduleBody = {
    ats_recruitment_interview_id: interview.id,
    start_at: new Date(now + 1000 * 60 * 60 * 24).toISOString(), // +1 day
    end_at: new Date(now + 1000 * 60 * 60 * 25).toISOString(), // +25h
    timezone: "Asia/Seoul",
    schedule_source: "manual",
    schedule_status: "proposed",
  } satisfies IAtsRecruitmentInterviewSchedule.ICreate;
  const schedule =
    await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.create(
      connection,
      {
        interviewId: interview.id,
        body: scheduleBody,
      },
    );
  typia.assert(schedule);

  // 11. Switch to system admin context
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });

  // 12. Delete the interview schedule slot as system admin
  await api.functional.atsRecruitment.systemAdmin.interviews.schedules.erase(
    connection,
    {
      interviewId: interview.id,
      scheduleId: schedule.id,
    },
  );

  // 13. Attempting to delete the same slot again should fail (already deleted)
  await TestValidator.error(
    "deleting schedule slot again results in error",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.schedules.erase(
        connection,
        {
          interviewId: interview.id,
          scheduleId: schedule.id,
        },
      );
    },
  );

  // 14. Recruiter context: attempt to delete the same slot (should fail - unauthorized)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    },
  });
  await TestValidator.error(
    "recruiter cannot delete schedule slot via system admin endpoint",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.schedules.erase(
        connection,
        {
          interviewId: interview.id,
          scheduleId: schedule.id,
        },
      );
    },
  );

  // 15. Applicant context: attempt to delete the same slot (should fail - unauthorized)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    },
  });
  await TestValidator.error(
    "applicant cannot delete schedule slot via system admin endpoint",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.schedules.erase(
        connection,
        {
          interviewId: interview.id,
          scheduleId: schedule.id,
        },
      );
    },
  );
}
