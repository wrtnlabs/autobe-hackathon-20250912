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
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentInterviewCalendarSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentInterviewCalendarSync";

/**
 * Validate audit and access control for ATS interview calendar sync audit
 * endpoint.
 *
 * The scenario covers full business workflow:
 *
 * - HR recruiter 1 joins, creates job posting
 * - Applicant joins and applies
 * - Recruiter 1 creates interview and a schedule (calendar syncs generated)
 * - Recruiter 1 fetches sync logs successfully (should include at least 1
 *   record, all fields present)
 * - Recruiter 2 and applicant cannot fetch recruiter 1's interview calendar
 *   sync logs (access control), tested by role switching and expecting
 *   errors
 * - Access denied for non-existent/deleted interview ID
 *
 * All API flows are authenticated by actual login/join APIs; TestValidator
 * is used for all validation, including error/permission boundary checks.
 * Each calendar sync log record is validated for critical fields. Covers
 * both audit log validation and strict access control boundaries for
 * cross-HR/applicant cases as well as deleted/nonexistent resources.
 */
export async function test_api_interview_calendar_sync_audit_and_access_control(
  connection: api.IConnection,
) {
  // 1. HR recruiter 1 signs up
  const recruiter1Email = typia.random<string & tags.Format<"email">>();
  const recruiter1Password = RandomGenerator.alphaNumeric(12);
  const recruiter1 = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiter1Email,
      password: recruiter1Password,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiter1);

  // 2. HR recruiter 2 signs up (for access control test)
  const recruiter2Email = typia.random<string & tags.Format<"email">>();
  const recruiter2Password = RandomGenerator.alphaNumeric(12);
  const recruiter2 = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiter2Email,
      password: recruiter2Password,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiter2);

  // 3. Applicant joins
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(12);
  const applicant = await api.functional.auth.applicant.join(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IAtsRecruitmentApplicant.ICreate,
  });
  typia.assert(applicant);

  // 4. Recruiter 1 creates job posting
  const jobPosting =
    await api.functional.atsRecruitment.hrRecruiter.jobPostings.create(
      connection,
      {
        body: {
          hr_recruiter_id: recruiter1.id,
          job_employment_type_id: typia.random<string & tags.Format<"uuid">>(),
          job_posting_state_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          location: RandomGenerator.paragraph({ sentences: 2 }),
          salary_range_min: 3500,
          salary_range_max: 6000,
          application_deadline: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          is_visible: true,
        } satisfies IAtsRecruitmentJobPosting.ICreate,
      },
    );
  typia.assert(jobPosting);

  // 5. Applicant logs in and applies
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

  // 6. Switch back to recruiter 1
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiter1Email,
      password: recruiter1Password,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 7. Recruiter 1 creates interview
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
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interview);

  // 8. Create an interview schedule (simulate calendar sync)
  const startAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const endAt = new Date(
    Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
  ).toISOString();
  const schedule =
    await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          start_at: startAt,
          end_at: endAt,
          timezone: "Asia/Seoul",
          schedule_source: "manual",
          schedule_status: "confirmed",
          cancellation_reason: null,
        } satisfies IAtsRecruitmentInterviewSchedule.ICreate,
      },
    );
  typia.assert(schedule);

  // 9. Owner fetches calendar sync logs
  const calendarSyncPage =
    await api.functional.atsRecruitment.hrRecruiter.interviews.calendarSyncs.index(
      connection,
      {
        interviewId: interview.id,
        body: {} satisfies IAtsRecruitmentInterviewCalendarSync.IRequest,
      },
    );
  typia.assert(calendarSyncPage);
  TestValidator.predicate(
    "calendar sync log page contains at least one record",
    calendarSyncPage.data.length > 0,
  );
  calendarSyncPage.data.forEach((syncLog) => {
    TestValidator.predicate(
      "sync log has valid sync_time",
      !!syncLog.sync_time,
    );
    TestValidator.predicate("sync log has sync_status", !!syncLog.sync_status);
    TestValidator.predicate("sync log type present", !!syncLog.sync_type);
  });

  // 10. Switch to recruiter 2 (should fail to access)
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiter2Email,
      password: recruiter2Password,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  await TestValidator.error(
    "cross-recruiter access to calendar sync logs denied",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.calendarSyncs.index(
        connection,
        {
          interviewId: interview.id,
          body: {} satisfies IAtsRecruitmentInterviewCalendarSync.IRequest,
        },
      );
    },
  );

  // 11. Switch to applicant (should fail to access)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });
  await TestValidator.error(
    "applicant should not access HR interview calendar sync logs",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.calendarSyncs.index(
        connection,
        {
          interviewId: interview.id,
          body: {} satisfies IAtsRecruitmentInterviewCalendarSync.IRequest,
        },
      );
    },
  );

  // 12. Switch back to recruiter 1
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiter1Email,
      password: recruiter1Password,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  // 13. Query with random/deleted interview id (should be denied)
  await TestValidator.error(
    "fetching non-existent interview's sync logs fails",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.calendarSyncs.index(
        connection,
        {
          interviewId: typia.random<string & tags.Format<"uuid">>(),
          body: {} satisfies IAtsRecruitmentInterviewCalendarSync.IRequest,
        },
      );
    },
  );
}
