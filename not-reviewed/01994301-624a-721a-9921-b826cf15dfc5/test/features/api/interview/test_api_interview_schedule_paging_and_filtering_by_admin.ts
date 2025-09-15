import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewParticipant";
import type { IAtsRecruitmentInterviewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewSchedule";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentInterviewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentInterviewSchedule";

/**
 * Validate that a system admin can page/filter interview schedule slots for any
 * interview.
 *
 * 1. Register system admin (random email/password/name, super_admin true)
 * 2. Register applicant (random)
 * 3. Create an interview as admin (random application_id, random
 *    title/stage/status)
 * 4. Add applicant as participant (role: applicant)
 * 5. Add HR recruiter as participant with simulated random UUID (role: recruiter)
 * 6. Create 7 schedule slots for the interview, round-robin over schedule_status
 *    ('confirmed', 'proposed', 'cancelled', 'rescheduled') and over timezones
 *    ("Asia/Seoul", "UTC", "America/New_York")
 * 7. For each status, call PATCH /interviews/{id}/schedules with status filter;
 *    validate all results match status and interviewId
 * 8. For each timezone, call with timezone filter, validate results
 * 9. Call with page/limit (limit less than total, check pagination)
 * 10. Call with status and timezone together, validate only matching entries
 * 11. Attempt with 'unathorized' connection, expect error
 * 12. Attempt with wrong random interviewId, expect error
 */
export async function test_api_interview_schedule_paging_and_filtering_by_admin(
  connection: api.IConnection,
) {
  // Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: "P@ssw0rd!" + RandomGenerator.alphaNumeric(4),
        name: RandomGenerator.name(),
        super_admin: true,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: "password123",
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IAtsRecruitmentApplicant.ICreate,
    });
  typia.assert(applicant);

  // Create interview (must provide ats_recruitment_application_id, title, stage, status)
  const ats_recruitment_application_id = typia.random<
    string & tags.Format<"uuid">
  >();
  const interview: IAtsRecruitmentInterview =
    await api.functional.atsRecruitment.systemAdmin.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id,
          title: RandomGenerator.name(3),
          stage: "first_phase",
          status: "scheduled",
          notes: RandomGenerator.paragraph(),
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interview);

  // Add applicant as participant
  const applicantParticipant: IAtsRecruitmentInterviewParticipant =
    await api.functional.atsRecruitment.systemAdmin.interviews.participants.create(
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

  // Add HR recruiter as participant (simulate by random id)
  const hrRecruiterId = typia.random<string & tags.Format<"uuid">>();
  const recruiterParticipant: IAtsRecruitmentInterviewParticipant =
    await api.functional.atsRecruitment.systemAdmin.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_hrrecruiter_id: hrRecruiterId,
          role: "recruiter",
          confirmation_status: "accepted",
        } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
      },
    );
  typia.assert(recruiterParticipant);

  // Create 7 interview schedules with different status/timezone
  const statuses = [
    "confirmed",
    "proposed",
    "cancelled",
    "rescheduled",
  ] as const;
  const timezones = ["Asia/Seoul", "UTC", "America/New_York"] as const;
  const schedules: IAtsRecruitmentInterviewSchedule[] = [];
  const now = new Date();
  for (let i = 0; i < 7; ++i) {
    const status = statuses[i % statuses.length];
    const timezone = timezones[i % timezones.length];
    const start_at = new Date(now.getTime() + 60 * 60000 * i).toISOString();
    const end_at = new Date(
      now.getTime() + 60 * 60000 * i + 30 * 60000,
    ).toISOString();
    const created =
      await api.functional.atsRecruitment.systemAdmin.interviews.schedules.create(
        connection,
        {
          interviewId: interview.id,
          body: {
            ats_recruitment_interview_id: interview.id,
            start_at,
            end_at,
            timezone,
            schedule_source: "manual",
            schedule_status: status,
            cancellation_reason:
              status === "cancelled" ? "Conflict" : undefined,
          } satisfies IAtsRecruitmentInterviewSchedule.ICreate,
        },
      );
    typia.assert(created);
    schedules.push(created);
  }

  // Filtering by status
  for (const status of statuses) {
    const out =
      await api.functional.atsRecruitment.systemAdmin.interviews.schedules.index(
        connection,
        {
          interviewId: interview.id,
          body: {
            interviewId: interview.id,
            schedule_status: status,
          } satisfies IAtsRecruitmentInterviewSchedule.IRequest,
        },
      );
    typia.assert(out);
    for (const s of out.data) {
      TestValidator.equals(
        `All schedules for interview with status=${status} should match filter`,
        s.schedule_status,
        status,
      );
      TestValidator.equals(
        `Schedule interview id matches`,
        s.ats_recruitment_interview_id,
        interview.id,
      );
    }
  }

  // Filtering by timezone
  for (const tz of timezones) {
    const out =
      await api.functional.atsRecruitment.systemAdmin.interviews.schedules.index(
        connection,
        {
          interviewId: interview.id,
          body: {
            interviewId: interview.id,
            timezone: tz,
          } satisfies IAtsRecruitmentInterviewSchedule.IRequest,
        },
      );
    typia.assert(out);
    for (const s of out.data) {
      TestValidator.equals(
        `All schedules for interview in timezone=${tz} should match filter`,
        s.timezone,
        tz,
      );
      TestValidator.equals(
        `Schedule interview id matches`,
        s.ats_recruitment_interview_id,
        interview.id,
      );
    }
  }

  // Paging (limit parameter)
  const outPaging =
    await api.functional.atsRecruitment.systemAdmin.interviews.schedules.index(
      connection,
      {
        interviewId: interview.id,
        body: {
          interviewId: interview.id,
          page: 1,
          limit: 3,
        } satisfies IAtsRecruitmentInterviewSchedule.IRequest,
      },
    );
  typia.assert(outPaging);
  TestValidator.equals("Paging respects limit", outPaging.data.length, 3);

  // Combined status + timezone filter
  for (const status of statuses) {
    for (const tz of timezones) {
      const expected = schedules.filter(
        (s) => s.schedule_status === status && s.timezone === tz,
      );
      if (expected.length === 0) continue;
      const out =
        await api.functional.atsRecruitment.systemAdmin.interviews.schedules.index(
          connection,
          {
            interviewId: interview.id,
            body: {
              interviewId: interview.id,
              schedule_status: status,
              timezone: tz,
            } satisfies IAtsRecruitmentInterviewSchedule.IRequest,
          },
        );
      typia.assert(out);
      for (const s of out.data) {
        TestValidator.equals(
          `Schedule status matches for filter: status=${status}, tz=${tz}`,
          s.schedule_status,
          status,
        );
        TestValidator.equals(
          "Schedule timezone matches filter",
          s.timezone,
          tz,
        );
      }
    }
  }

  // Unauthorized: remove token/headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Admin schedule paging fails with no auth",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.schedules.index(
        unauthConn,
        {
          interviewId: interview.id,
          body: {
            interviewId: interview.id,
          } satisfies IAtsRecruitmentInterviewSchedule.IRequest,
        },
      );
    },
  );

  // Non-existent interview
  await TestValidator.error(
    "Admin cannot page/filter schedules for non-existent interview",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.schedules.index(
        connection,
        {
          interviewId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            interviewId: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IAtsRecruitmentInterviewSchedule.IRequest,
        },
      );
    },
  );
}
