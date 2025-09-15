import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewParticipant";
import type { IAtsRecruitmentInterviewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewSchedule";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentInterviewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentInterviewSchedule";

/**
 * Validate schedule paging and filtering for an interview by HR recruiter.
 *
 * Business context: HR recruiters must coordinate interviews, often across
 * time zones and workflow states. This function ensures that schedule
 * querying supports filtering (status, timezone), paging, sorting, and
 * error-handling when interview IDs are invalid or unauthorized. The
 * function creates all test fixtures and then exercises the listing API
 * under multiple query conditions.
 *
 * Steps:
 *
 * 1. Register an HR recruiter via join (saves email for login context)
 * 2. Register an applicant
 * 3. Create a new interview (using applicant, random title/stage/status)
 * 4. Add applicant and HR recruiter as interview participants
 * 5. Create multiple diverse schedule slots (different statuses, timezones)
 * 6. Retrieve all schedules with no filters; verify all exist and
 *    pagination/meta correct
 * 7. Test filtering: by schedule_status, timezone, and check results match
 *    filter
 * 8. Test pagination: request with explicit page/limit, verify correct slicing
 *    and meta
 * 9. Test error case: try listing schedules using an invalid interviewId;
 *    expect error
 */
export async function test_api_interview_schedule_paging_and_filtering_by_hr_recruiter(
  connection: api.IConnection,
) {
  // 1. HR recruiter registers
  const hrRecruiterEmail = typia.random<string & tags.Format<"email">>();
  const hrRecruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: hrRecruiterEmail,
        password: "1234!@#Hr",
        name: RandomGenerator.name(),
        department: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(hrRecruiter);

  // 2. Applicant registers
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: "1234!@#Ap",
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IAtsRecruitmentApplicant.ICreate,
    });
  typia.assert(applicant);

  // 3. Create interview (random stage/status)
  const interviewCreate = {
    ats_recruitment_application_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    stage: RandomGenerator.pick([
      "first_phase",
      "tech_round",
      "final",
    ] as const),
    status: RandomGenerator.pick([
      "scheduled",
      "pending",
      "cancelled",
    ] as const),
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IAtsRecruitmentInterview.ICreate;
  const interview: IAtsRecruitmentInterview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      { body: interviewCreate },
    );
  typia.assert(interview);

  // 4. Add applicant and hr recruiter as participants
  const nowIso = new Date().toISOString();
  const applicantParticipant =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_applicant_id: applicant.id,
          role: "applicant",
          confirmation_status: "pending",
        } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
      },
    );
  typia.assert(applicantParticipant);
  const hrRecruiterParticipant =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_hrrecruiter_id: hrRecruiter.id,
          role: "recruiter",
          confirmation_status: "accepted",
        } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
      },
    );
  typia.assert(hrRecruiterParticipant);

  // 5. Create diverse schedule slots (vary status, timezone)
  const statuses = [
    "proposed",
    "confirmed",
    "cancelled",
    "rescheduled",
  ] as const;
  const timezones = [
    "Asia/Seoul",
    "America/New_York",
    "Europe/London",
  ] as const;
  const start = new Date();
  const scheduleSlots = ArrayUtil.repeat(8, (i) => {
    const startAt = new Date(start.getTime() + i * 60 * 60 * 1000); // Each 1 hour apart
    return {
      ats_recruitment_interview_id: interview.id,
      start_at: new Date(startAt).toISOString(),
      end_at: new Date(startAt.getTime() + 30 * 60 * 1000).toISOString(),
      timezone: RandomGenerator.pick(timezones),
      schedule_source: RandomGenerator.pick([
        "manual",
        "auto",
        "google_calendar",
      ] as const),
      schedule_status: RandomGenerator.pick(statuses),
      cancellation_reason: null,
    } satisfies IAtsRecruitmentInterviewSchedule.ICreate;
  });
  for (const body of scheduleSlots)
    typia.assert(
      await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.create(
        connection,
        { interviewId: interview.id, body },
      ),
    );

  // 6. List all schedules with no filters
  const allSchedulesPage =
    await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.index(
      connection,
      {
        interviewId: interview.id,
        body: {
          interviewId: interview.id,
        } satisfies IAtsRecruitmentInterviewSchedule.IRequest,
      },
    );
  typia.assert(allSchedulesPage);
  TestValidator.predicate(
    "all created schedules should exist",
    allSchedulesPage.data.length >= scheduleSlots.length,
  );

  // 7. Filter by schedule_status (test each status at least once exists)
  for (const status of statuses) {
    const filteredPage =
      await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.index(
        connection,
        {
          interviewId: interview.id,
          body: {
            interviewId: interview.id,
            schedule_status: status,
          } satisfies IAtsRecruitmentInterviewSchedule.IRequest,
        },
      );
    typia.assert(filteredPage);
    for (const s of filteredPage.data)
      TestValidator.equals(
        `schedule status matches filter for ${status}`,
        s.schedule_status,
        status,
      );
  }

  // 8. Filter by timezone
  for (const timezone of timezones) {
    const filteredPage =
      await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.index(
        connection,
        {
          interviewId: interview.id,
          body: {
            interviewId: interview.id,
            timezone,
          } satisfies IAtsRecruitmentInterviewSchedule.IRequest,
        },
      );
    typia.assert(filteredPage);
    for (const s of filteredPage.data)
      TestValidator.equals(
        `timezone matches filter (${timezone})`,
        s.timezone,
        timezone,
      );
  }

  // 9. Pagination test: page/limit, check correct slicing
  const page = 2;
  const limit = 3;
  const paged =
    await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.index(
      connection,
      {
        interviewId: interview.id,
        body: {
          interviewId: interview.id,
          page: page satisfies number as number,
          limit: limit satisfies number as number,
        } satisfies IAtsRecruitmentInterviewSchedule.IRequest,
      },
    );
  typia.assert(paged);
  TestValidator.equals(
    "pagination: current page matches",
    paged.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination: limit matches",
    paged.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination: data length <= limit",
    paged.data.length <= limit,
  );

  // 10. Error case - invalid interviewId
  await TestValidator.error("invalid interviewId should error", async () => {
    await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.index(
      connection,
      {
        interviewId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          interviewId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IAtsRecruitmentInterviewSchedule.IRequest,
      },
    );
  });
}
