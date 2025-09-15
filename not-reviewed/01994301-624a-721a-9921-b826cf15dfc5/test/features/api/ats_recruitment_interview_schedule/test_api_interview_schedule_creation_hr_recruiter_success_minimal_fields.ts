import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewSchedule";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test successful creation of a new interview schedule by an HR recruiter for a
 * given interview with minimal required fields. Steps: (1) Register and login
 * as HR recruiter; (2) Create a minimal interview to obtain interview id; (3)
 * Create a schedule providing only required fields; (4) Verify schedule,
 * timestamps, and response; (5) Test invalid schedule time (end before start)
 * is rejected; (6) Test unauthenticated user cannot create schedule.
 */
export async function test_api_interview_schedule_creation_hr_recruiter_success_minimal_fields(
  connection: api.IConnection,
) {
  // 1. Register and login as HR recruiter
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterEmail,
      password: "testpass123",
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiter);
  // 2. Create interview for an application (simulate minimal flow)
  const applicationId = typia.random<string & tags.Format<"uuid">>();
  const interviewBody = {
    ats_recruitment_application_id: applicationId,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    stage: "first_phase",
    status: "scheduled",
  } satisfies IAtsRecruitmentInterview.ICreate;
  const interview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      { body: interviewBody },
    );
  typia.assert(interview);
  TestValidator.equals(
    "interview returned correct application id",
    interview.ats_recruitment_application_id,
    applicationId,
  );

  // 3. Create a valid schedule (minimal required fields)
  const now = new Date();
  const start = new Date(now.getTime() + 3600 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const scheduleBody = {
    ats_recruitment_interview_id: interview.id,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    timezone: "Asia/Seoul",
    schedule_source: "manual",
    schedule_status: "confirmed",
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
  TestValidator.equals(
    "schedule interview reference",
    schedule.ats_recruitment_interview_id,
    interview.id,
  );
  TestValidator.equals(
    "schedule start_at matches",
    schedule.start_at,
    scheduleBody.start_at,
  );
  TestValidator.equals(
    "schedule end_at matches",
    schedule.end_at,
    scheduleBody.end_at,
  );
  TestValidator.equals(
    "schedule timezone matches",
    schedule.timezone,
    scheduleBody.timezone,
  );
  TestValidator.equals(
    "schedule_status matches",
    schedule.schedule_status,
    scheduleBody.schedule_status,
  );
  TestValidator.equals(
    "schedule_source matches",
    schedule.schedule_source,
    scheduleBody.schedule_source,
  );
  TestValidator.predicate(
    "created_at present",
    typeof schedule.created_at === "string" && schedule.created_at.length > 15,
  );
  TestValidator.predicate(
    "updated_at present",
    typeof schedule.updated_at === "string" && schedule.updated_at.length > 15,
  );
  // 4. Try to create with end_at < start_at (invalid)
  await TestValidator.error(
    "schedule creation rejects end before start",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.create(
        connection,
        {
          interviewId: interview.id,
          body: {
            ...scheduleBody,
            start_at: end.toISOString(),
            end_at: start.toISOString(),
          } satisfies IAtsRecruitmentInterviewSchedule.ICreate,
        },
      );
    },
  );
  // 5. Try unauthenticated creation (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot create schedule",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.create(
        unauthConn,
        {
          interviewId: interview.id,
          body: scheduleBody,
        },
      );
    },
  );
}
