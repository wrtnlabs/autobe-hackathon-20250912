import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewSchedule";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate the ability of an HR recruiter to view full details for an
 * interview schedule slot via the 'get
 * /atsRecruitment/hrRecruiter/interviews/{interviewId}/schedules/{scheduleId}'
 * endpoint, covering end-to-end business workflow and key edge cases.
 *
 * 1. HR recruiter registers using the join endpoint.
 * 2. HR recruiter creates an interview (with a random application id, title,
 *    stage etc.).
 * 3. HR recruiter creates a schedule slot for the newly created interview
 *    (random start/end, source/status fields).
 * 4. Recruiter retrieves the schedule slot using both interviewId and
 *    scheduleId.
 * 5. Validate properties: parent interview reference, start/end time,
 *    timezone, source, schedule status, cancellation reason (if any), and
 *    all datetime fields. All structural fields must match exactly.
 * 6. Attempt access with a made-up interviewId and/or scheduleId (expect
 *    error).
 * 7. Attempt access with empty headers (simulate unauthenticated request,
 *    expect error).
 */
export async function test_api_interview_schedule_detail_hr_recruiter_access_complete_workflow(
  connection: api.IConnection,
) {
  // Register HR recruiter
  const email = typia.random<string & tags.Format<"email">>();
  const password = "StrongP@ssw0rd";
  const joinResult = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email,
      password,
      name: RandomGenerator.name(),
      department: RandomGenerator.name(1),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(joinResult);

  // 2. Create interview
  const interviewCreate = {
    ats_recruitment_application_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    stage: "first_phase",
    status: "scheduled",
    notes: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies IAtsRecruitmentInterview.ICreate;
  const interview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      { body: interviewCreate },
    );
  typia.assert(interview);

  // 3. Create schedule slot
  const now = Date.now();
  const slotStart = new Date(now + 3600_000).toISOString();
  const slotEnd = new Date(now + 7200_000).toISOString();
  const scheduleCreate = {
    ats_recruitment_interview_id: interview.id,
    start_at: slotStart,
    end_at: slotEnd,
    timezone: "Asia/Seoul",
    schedule_source: "manual",
    schedule_status: "confirmed",
    cancellation_reason: null,
  } satisfies IAtsRecruitmentInterviewSchedule.ICreate;
  const schedule =
    await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.create(
      connection,
      {
        interviewId: interview.id,
        body: scheduleCreate,
      },
    );
  typia.assert(schedule);

  // 4. Retrieve and assert schedule details
  const scheduleDetail =
    await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.at(
      connection,
      {
        interviewId: interview.id,
        scheduleId: schedule.id,
      },
    );
  typia.assert(scheduleDetail);
  TestValidator.equals("schedule id matches", scheduleDetail.id, schedule.id);
  TestValidator.equals(
    "parent interviewId matches",
    scheduleDetail.ats_recruitment_interview_id,
    interview.id,
  );
  TestValidator.equals("start_at matches", scheduleDetail.start_at, slotStart);
  TestValidator.equals("end_at matches", scheduleDetail.end_at, slotEnd);
  TestValidator.equals(
    "timezone matches",
    scheduleDetail.timezone,
    scheduleCreate.timezone,
  );
  TestValidator.equals(
    "schedule source matches",
    scheduleDetail.schedule_source,
    scheduleCreate.schedule_source,
  );
  TestValidator.equals(
    "schedule status matches",
    scheduleDetail.schedule_status,
    scheduleCreate.schedule_status,
  );
  TestValidator.equals(
    "cancellation_reason matches (null)",
    scheduleDetail.cancellation_reason,
    null,
  );
  TestValidator.predicate(
    "created_at is ISO string",
    typeof scheduleDetail.created_at === "string" &&
      !isNaN(Date.parse(scheduleDetail.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    typeof scheduleDetail.updated_at === "string" &&
      !isNaN(Date.parse(scheduleDetail.updated_at)),
  );

  // 5. Error case: Nonexistent interviewId/scheduleId
  await TestValidator.error(
    "should throw for nonexistent interviewId",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.at(
        connection,
        {
          interviewId: typia.random<string & tags.Format<"uuid">>(),
          scheduleId: schedule.id,
        },
      );
    },
  );

  await TestValidator.error(
    "should throw for nonexistent scheduleId",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.at(
        connection,
        {
          interviewId: interview.id,
          scheduleId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Unauthorized (empty token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should throw for unauthenticated recruiter",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.at(
        unauthConn,
        {
          interviewId: interview.id,
          scheduleId: schedule.id,
        },
      );
    },
  );

  // 7. (Optional) Try to get after schedule deleted (if API provided)
  // Not implemented as API for delete is not present in provided materials
}
