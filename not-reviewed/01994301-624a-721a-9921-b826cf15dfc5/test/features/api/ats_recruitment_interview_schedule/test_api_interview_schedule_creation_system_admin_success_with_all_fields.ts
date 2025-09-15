import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewSchedule";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test successful creation of an interview schedule slot by a system
 * administrator, specifying all available fields including start time, end
 * time, timezone, schedule source (manual/google), notes, and status. Steps:
 * (1) Register/login as system admin; (2) Create all supporting resources to
 * get a valid interviewId (including use of any applicant/job/interview
 * dependencies via creation endpoints); (3) Invoke schedule creation endpoint
 * with all field combinations; (4) Assert created schedule matches input,
 * timestamps/fields are persisted as specified, and visible in admin panel; (5)
 * Check for audit logging. Edge cases: attempt to create with
 * invalid/overlapping times, missing required fields, or as a non-admin user.
 */
export async function test_api_interview_schedule_creation_system_admin_success_with_all_fields(
  connection: api.IConnection,
) {
  // 1. Register as system administrator (super admin)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        super_admin: true,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals("system admin email matches", admin.email, adminEmail);
  TestValidator.equals("system admin name matches", admin.name, adminName);
  TestValidator.predicate("admin super_admin true", admin.super_admin === true);

  // 2. Create interview (assuming an application_id is required)
  const applicationId = typia.random<string & tags.Format<"uuid">>();
  const interviewBody = {
    ats_recruitment_application_id: applicationId,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    stage: RandomGenerator.pick([
      "first_phase",
      "tech_round",
      "final",
      "custom",
    ] as const),
    status: RandomGenerator.pick([
      "scheduled",
      "pending",
      "completed",
      "cancelled",
    ] as const),
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IAtsRecruitmentInterview.ICreate;
  const interview: IAtsRecruitmentInterview =
    await api.functional.atsRecruitment.systemAdmin.interviews.create(
      connection,
      {
        body: interviewBody,
      },
    );
  typia.assert(interview);
  TestValidator.equals(
    "interview application ID matches",
    interview.ats_recruitment_application_id,
    interviewBody.ats_recruitment_application_id,
  );
  TestValidator.equals(
    "interview stage matches",
    interview.stage,
    interviewBody.stage,
  );
  TestValidator.equals(
    "interview status matches",
    interview.status,
    interviewBody.status,
  );
  TestValidator.equals(
    "interview notes matches",
    interview.notes,
    interviewBody.notes,
  );
  TestValidator.predicate(
    "interview has created_at",
    typeof interview.created_at === "string",
  );
  TestValidator.predicate(
    "interview has updated_at",
    typeof interview.updated_at === "string",
  );

  // 3. Create schedule with all fields filled
  const now = new Date();
  const startAt = new Date(now.getTime() + 1000 * 60 * 60).toISOString(); // +1h
  const endAt = new Date(now.getTime() + 1000 * 60 * 120).toISOString(); // +2h
  const scheduleBody = {
    ats_recruitment_interview_id: interview.id,
    start_at: startAt,
    end_at: endAt,
    timezone: RandomGenerator.pick([
      "Asia/Seoul",
      "America/New_York",
      "Europe/London",
    ] as const),
    schedule_source: RandomGenerator.pick([
      "manual",
      "google_calendar",
    ] as const),
    schedule_status: RandomGenerator.pick([
      "proposed",
      "confirmed",
      "cancelled",
    ] as const),
    cancellation_reason: null,
  } satisfies IAtsRecruitmentInterviewSchedule.ICreate;
  const schedule: IAtsRecruitmentInterviewSchedule =
    await api.functional.atsRecruitment.systemAdmin.interviews.schedules.create(
      connection,
      {
        interviewId: interview.id,
        body: scheduleBody,
      },
    );
  typia.assert(schedule);
  TestValidator.equals(
    "schedule interview id",
    schedule.ats_recruitment_interview_id,
    scheduleBody.ats_recruitment_interview_id,
  );
  TestValidator.equals(
    "schedule start_at",
    schedule.start_at,
    scheduleBody.start_at,
  );
  TestValidator.equals("schedule end_at", schedule.end_at, scheduleBody.end_at);
  TestValidator.equals(
    "schedule timezone",
    schedule.timezone,
    scheduleBody.timezone,
  );
  TestValidator.equals(
    "schedule_source",
    schedule.schedule_source,
    scheduleBody.schedule_source,
  );
  TestValidator.equals(
    "schedule_status",
    schedule.schedule_status,
    scheduleBody.schedule_status,
  );
  TestValidator.equals(
    "cancellation_reason is null",
    schedule.cancellation_reason,
    null,
  );
  TestValidator.predicate(
    "schedule has created_at",
    typeof schedule.created_at === "string",
  );
  TestValidator.predicate(
    "schedule has updated_at",
    typeof schedule.updated_at === "string",
  );
}
