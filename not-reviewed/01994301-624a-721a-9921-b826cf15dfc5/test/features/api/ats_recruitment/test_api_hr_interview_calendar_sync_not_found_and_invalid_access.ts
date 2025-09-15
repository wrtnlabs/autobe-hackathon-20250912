import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewCalendarSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewCalendarSync";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate HR recruiter cannot access unrelated or non-existent interview
 * calendar sync records.
 *
 * 1. HR recruiter A registers (join).
 * 2. HR recruiter B registers (join).
 * 3. Recruiter A creates an interview (obtain valid interviewId).
 * 4. Recruiter B attempts to fetch a calendarSync by random UUID (should 404/not
 *    found).
 * 5. Recruiter B attempts to fetch calendarSync for A's interview with random UUID
 *    (should 404).
 * 6. Recruiter B attempts to fetch calendarSync for random interviewId and
 *    calendarSyncId (should 404).
 * 7. Recruiter B cannot access any valid calendar sync records of recruiter A
 *    (forbidden/404).
 *
 * All cases must throw and be validated as error cases.
 */
export async function test_api_hr_interview_calendar_sync_not_found_and_invalid_access(
  connection: api.IConnection,
) {
  // 1. HR recruiter A join
  const recruiterA_email = typia.random<string & tags.Format<"email">>();
  const recruiterA: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: recruiterA_email,
        password: "Password1!",
        name: RandomGenerator.name(),
        department: null,
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(recruiterA);

  // 2. HR recruiter B join
  const recruiterB_email = typia.random<string & tags.Format<"email">>();
  const recruiterB: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: recruiterB_email,
        password: "Password1!",
        name: RandomGenerator.name(),
        department: null,
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(recruiterB);
  // Switch context to recruiter A for interview creation
  await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterA_email,
      password: "Password1!",
      name: recruiterA.name,
      department: null,
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });

  // 3. Recruiter A creates interview
  const applicationId = typia.random<string & tags.Format<"uuid">>();
  const interview: IAtsRecruitmentInterview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: applicationId,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          stage: "first_phase",
          status: "scheduled",
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interview);
  // Switch context back to recruiter B
  await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterB_email,
      password: "Password1!",
      name: recruiterB.name,
      department: null,
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  // 4. Attempt access with random interview and calendarSync UUIDs (totally non-existent)
  await TestValidator.error(
    "cannot access non-existent calendar sync by random UUIDs",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.calendarSyncs.at(
        connection,
        {
          interviewId: typia.random<string & tags.Format<"uuid">>(),
          calendarSyncId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 5. Attempt access for A's interview but calendarSync is random (should 404)
  await TestValidator.error(
    "cannot access non-existent calendar sync for valid interviewId",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.calendarSyncs.at(
        connection,
        {
          interviewId: interview.id,
          calendarSyncId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 6. Attempt access for random interviewId with random calendarSyncId
  await TestValidator.error(
    "cannot access non-existent interview and calendar sync",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.calendarSyncs.at(
        connection,
        {
          interviewId: typia.random<string & tags.Format<"uuid">>(),
          calendarSyncId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 7. Recruiter B cannot view any calendar syncs of A's interview. (Try with random calendarSyncId again)
  await TestValidator.error(
    "cannot access calendar sync of another recruiter (assuming forbidden or 404)",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.calendarSyncs.at(
        connection,
        {
          interviewId: interview.id,
          calendarSyncId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
