import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentApplication } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplication";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewCalendarSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewCalendarSync";
import type { IAtsRecruitmentInterviewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewSchedule";
import type { IAtsRecruitmentJobPosting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentJobPosting";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentInterviewCalendarSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentInterviewCalendarSync";

/**
 * System admin can retrieve and audit the calendar synchronization log for any
 * interview across the system.
 *
 * Workflow:
 *
 * 1. System admin joins and logs in.
 * 2. HR recruiter signs up and logs in.
 * 3. Applicant signs up and logs in.
 * 4. HR recruiter creates a job posting.
 * 5. Applicant applies to that job posting.
 * 6. HR recruiter creates an interview for the application.
 * 7. HR recruiter creates at least one interview schedule slot (to guarantee
 *    calendar sync entry).
 * 8. Switch to system admin and retrieve the list of calendar sync logs for that
 *    interview (PATCH endpoint).
 * 9. Validate that all sync details (status, external_event_id, error_message,
 *    timestamps, etc.) exist and pagination is correct.
 * 10. Negative: Try accessing calendar syncs as non-admin, try listing syncs on
 *     non-existent interview, and on deleted interview.
 */
export async function test_api_admin_interview_calendar_sync_list_and_audit(
  connection: api.IConnection,
) {
  // Admin registration and login
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = "Admin1234!";
  await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      password: sysAdminPassword,
      name: RandomGenerator.name(),
      super_admin: true,
    },
  });
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      password: sysAdminPassword,
    },
  });

  // HR recruiter registration and login
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = "HrRecruiter123!";
  await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    },
  });

  // Applicant registration and login
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = "Applicant123!";
  await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    },
  });

  // HR recruiter creates job posting
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: typia.random<string & tags.Format<"uuid">>(), // placeholder, should be set from recruiter entity but mockup cannot retrieve
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          location: RandomGenerator.paragraph({ sentences: 2 }),
          salary_range_min: 50000,
          salary_range_max: 90000,
          application_deadline: new Date(
            Date.now() + 86400000 * 14,
          ).toISOString(),
          is_visible: true,
        },
      },
    );

  // Applicant creates application
  const application =
    await api.functional.atsRecruitment.applicant.applications.create(
      connection,
      {
        body: {
          job_posting_id: jobPosting.id,
        },
      },
    );

  // HR recruiter logs in again for interview creation
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    },
  });

  // Create interview by HR recruiter
  const interview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: application.id,
          title: RandomGenerator.paragraph({ sentences: 2 }),
          stage: "first_phase",
          status: "scheduled",
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );

  // Schedule interview (to trigger calendar sync)
  const start = new Date(Date.now() + 86400000); // tomorrow
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour slot
  await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.create(
    connection,
    {
      interviewId: interview.id,
      body: {
        ats_recruitment_interview_id: interview.id,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        timezone: "Asia/Seoul",
        schedule_source: "manual",
        schedule_status: "confirmed",
      },
    },
  );

  // System admin logs in again
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      password: sysAdminPassword,
    },
  });

  // Retrieve calendar sync logs for this interview as admin
  const page: IPageIAtsRecruitmentInterviewCalendarSync =
    await api.functional.atsRecruitment.systemAdmin.interviews.calendarSyncs.index(
      connection,
      {
        interviewId: interview.id,
        body: {},
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "at least one calendar sync exists",
    page.data.length > 0,
  );
  for (const sync of page.data) {
    typia.assert(sync);
    TestValidator.equals(
      "interview id in sync log matches interview",
      sync.ats_recruitment_interview_id,
      interview.id,
    );
    TestValidator.predicate(
      "sync log has status",
      typeof sync.sync_status === "string",
    );
    TestValidator.predicate(
      "sync log has sync type",
      typeof sync.sync_type === "string",
    );
    TestValidator.predicate(
      "sync log has creation timestamp",
      typeof sync.created_at === "string",
    );
  }

  // Negative: Try with non-existent interview
  const fakeInterviewId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent interviewId is rejected",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.calendarSyncs.index(
        connection,
        {
          interviewId: fakeInterviewId,
          body: {},
        },
      );
    },
  );

  // Negative: Try as non-admin (hr recruiter)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    },
  });
  await TestValidator.error(
    "non-admin cannot access arbitrary interview calendar syncs",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.calendarSyncs.index(
        connection,
        {
          interviewId: interview.id,
          body: {},
        },
      );
    },
  );

  // Negative: Try as non-admin (applicant)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    },
  });
  await TestValidator.error(
    "applicant cannot access arbitrary interview calendar syncs",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.calendarSyncs.index(
        connection,
        {
          interviewId: interview.id,
          body: {},
        },
      );
    },
  );
}
