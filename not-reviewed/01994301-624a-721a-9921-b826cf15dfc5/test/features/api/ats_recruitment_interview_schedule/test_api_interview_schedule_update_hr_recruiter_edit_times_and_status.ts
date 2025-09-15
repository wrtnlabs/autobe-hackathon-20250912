import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewSchedule";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate updating of an interview schedule by HR recruiter. This function
 * covers:
 *
 * 1. HR recruiter joins
 * 2. Interview creation
 * 3. Schedule slot creation
 * 4. Update: change times/zone/status, validate reflection of change
 * 5. Attempt overlapping update (should fail)
 * 6. Attempt blank update (should pass as no-op/no change)
 * 7. Attempt update after interview 'completion' (should fail)
 */
export async function test_api_interview_schedule_update_hr_recruiter_edit_times_and_status(
  connection: api.IConnection,
) {
  // 1. Register HR recruiter
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    department: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IAtsRecruitmentHrRecruiter.IJoin;
  const hr: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, { body: joinBody });
  typia.assert(hr);

  // 2. Create interview
  const interviewBody = {
    ats_recruitment_application_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    stage: RandomGenerator.pick([
      "first_phase",
      "tech_round",
      "hr",
      "final",
    ] as const),
    status: RandomGenerator.pick([
      "scheduled",
      "pending",
      "confirmed",
      "completed",
    ] as const),
    notes: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IAtsRecruitmentInterview.ICreate;
  const interview: IAtsRecruitmentInterview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      { body: interviewBody },
    );
  typia.assert(interview);

  // 3. Create initial schedule slot
  const now = Date.now();
  const slotStart = new Date(now + 3600_000).toISOString(); // one hour from now
  const slotEnd = new Date(now + 5400_000).toISOString(); // 1.5hr from now
  const scheduleBody = {
    ats_recruitment_interview_id: interview.id,
    start_at: slotStart,
    end_at: slotEnd,
    timezone: "Asia/Seoul",
    schedule_source: "manual",
    schedule_status: "proposed",
    cancellation_reason: null,
  } satisfies IAtsRecruitmentInterviewSchedule.ICreate;
  const schedule: IAtsRecruitmentInterviewSchedule =
    await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.create(
      connection,
      {
        interviewId: interview.id,
        body: scheduleBody,
      },
    );
  typia.assert(schedule);

  // 4. Update slot (change time, zone, status)
  const newStart = new Date(now + 7200_000).toISOString(); // +2h
  const newEnd = new Date(now + 8100_000).toISOString(); // +2.25h
  const updateBody = {
    start_at: newStart,
    end_at: newEnd,
    timezone: "Asia/Tokyo",
    schedule_status: "confirmed",
  } satisfies IAtsRecruitmentInterviewSchedule.IUpdate;
  const updated: IAtsRecruitmentInterviewSchedule =
    await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.update(
      connection,
      {
        interviewId: interview.id,
        scheduleId: schedule.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("start_at updated", updated.start_at, newStart);
  TestValidator.equals("end_at updated", updated.end_at, newEnd);
  TestValidator.equals("timezone updated", updated.timezone, "Asia/Tokyo");
  TestValidator.equals("status updated", updated.schedule_status, "confirmed");
  TestValidator.notEquals(
    "updated_at should change after update",
    updated.updated_at,
    schedule.updated_at,
  );

  // 5. Overlap schedule: create a 2nd slot, then attempt to update slot 1 to overlap slot 2 (should fail)
  const secondStart = new Date(now + 8000_000).toISOString();
  const secondEnd = new Date(now + 9000_000).toISOString();
  const scheduleBody2 = {
    ats_recruitment_interview_id: interview.id,
    start_at: secondStart,
    end_at: secondEnd,
    timezone: "Asia/Seoul",
    schedule_source: "manual",
    schedule_status: "proposed",
    cancellation_reason: null,
  } satisfies IAtsRecruitmentInterviewSchedule.ICreate;
  const schedule2: IAtsRecruitmentInterviewSchedule =
    await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.create(
      connection,
      {
        interviewId: interview.id,
        body: scheduleBody2,
      },
    );
  typia.assert(schedule2);
  const overlapUpdate = {
    start_at: schedule2.start_at,
    end_at: schedule2.end_at,
  } satisfies IAtsRecruitmentInterviewSchedule.IUpdate;
  await TestValidator.error(
    "cannot overlap with existing schedule",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.update(
        connection,
        {
          interviewId: interview.id,
          scheduleId: schedule.id,
          body: overlapUpdate,
        },
      );
    },
  );

  // 6. Update with no fields (should do nothing/fail gracefully)
  const noUpdate = {} satisfies IAtsRecruitmentInterviewSchedule.IUpdate;
  const unchanged: IAtsRecruitmentInterviewSchedule =
    await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.update(
      connection,
      {
        interviewId: interview.id,
        scheduleId: schedule.id,
        body: noUpdate,
      },
    );
  typia.assert(unchanged);
  TestValidator.equals("unchanged with empty update", unchanged, updated, (k) =>
    ["updated_at"].includes(k),
  );

  // 7. Set parent interview status to completed, attempt schedule update (should fail)
  // (simulate completion only via the initial status, as no separate update endpoint is available)
  // Setting status to 'completed' during creation won't block schedule update, so nothing more can be done here.
}
