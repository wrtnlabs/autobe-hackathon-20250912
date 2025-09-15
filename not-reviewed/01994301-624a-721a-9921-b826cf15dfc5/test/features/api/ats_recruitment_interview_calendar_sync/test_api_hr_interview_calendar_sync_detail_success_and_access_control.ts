import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewCalendarSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewCalendarSync";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Verify retrieval of a specific interview's calendar sync detail for HR
 * recruiter, including access control.
 *
 * Steps:
 *
 * 1. Register and authenticate HR recruiter #1 (authorized)
 * 2. Register and authenticate HR recruiter #2 (unauthorized)
 * 3. Create an interview with HR recruiter #1; extract interviewId
 * 4. (Assume) At least one calendar sync exists for that interview (inject or
 *    rely on existing)
 * 5. Retrieve calendar syncs for the interview (simulate via typia.random or
 *    placeholder: use typia.random for matching calendarSyncId)
 * 6. As HR recruiter #1, fetch details for the interview's calendar sync
 *    (should succeed)
 * 7. As HR recruiter #2, attempt to fetch same calendar sync details (should
 *    fail with error)
 * 8. As HR recruiter #1, attempt to fetch with non-existent interviewId or
 *    calendarSyncId (should fail with error)
 */
export async function test_api_hr_interview_calendar_sync_detail_success_and_access_control(
  connection: api.IConnection,
) {
  // 1. Register and authenticate HR recruiter #1
  const recruiter1Join = await api.functional.auth.hrRecruiter.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        department: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    },
  );
  typia.assert(recruiter1Join);
  const recruiter1Id = recruiter1Join.id;

  // 2. Register and authenticate HR recruiter #2
  const recruiter2Join = await api.functional.auth.hrRecruiter.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        department: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    },
  );
  typia.assert(recruiter2Join);

  // 3. Switch back to recruiter #1 (simulate login via join - as per SDK behavior)
  await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiter1Join.email,
      password: recruiter1Join.token.access.substring(0, 12), // test harness - not used in practice
      name: recruiter1Join.name,
      department: recruiter1Join.department,
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });

  // 4. Create an interview (minimum payload)
  const interview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          stage: "first_phase",
          status: "scheduled",
          notes: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interview);

  // 5. Simulate calendar sync presence for this interview
  const calendarSync = typia.random<IAtsRecruitmentInterviewCalendarSync>();
  const calendarSyncFixed = {
    ...calendarSync,
    ats_recruitment_interview_id: interview.id,
  } satisfies IAtsRecruitmentInterviewCalendarSync;
  typia.assert(calendarSyncFixed);

  // 6. As recruiter #1, fetch calendar sync details (should succeed)
  const detail =
    await api.functional.atsRecruitment.hrRecruiter.interviews.calendarSyncs.at(
      connection,
      {
        interviewId: calendarSyncFixed.ats_recruitment_interview_id,
        calendarSyncId: calendarSyncFixed.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals(
    "calendar sync detail matches",
    detail,
    calendarSyncFixed,
    (k) => /created_at/gi.test(k),
  );

  // 7. Switch to recruiter #2 (simulate login)
  await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiter2Join.email,
      password: recruiter2Join.token.access.substring(0, 12),
      name: recruiter2Join.name,
      department: recruiter2Join.department,
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  await TestValidator.error(
    "unauthorized recruiter cannot access calendar sync of another recruiter's interview",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.calendarSyncs.at(
        connection,
        {
          interviewId: calendarSyncFixed.ats_recruitment_interview_id,
          calendarSyncId: calendarSyncFixed.id,
        },
      );
    },
  );

  // 8. Switch to recruiter #1
  await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiter1Join.email,
      password: recruiter1Join.token.access.substring(0, 12),
      name: recruiter1Join.name,
      department: recruiter1Join.department,
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  await TestValidator.error(
    "should 404 when using invalid interviewId",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.calendarSyncs.at(
        connection,
        {
          interviewId: typia.random<string & tags.Format<"uuid">>(),
          calendarSyncId: calendarSyncFixed.id,
        },
      );
    },
  );
  await TestValidator.error(
    "should 404 when using invalid calendarSyncId",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.calendarSyncs.at(
        connection,
        {
          interviewId: calendarSyncFixed.ats_recruitment_interview_id,
          calendarSyncId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
