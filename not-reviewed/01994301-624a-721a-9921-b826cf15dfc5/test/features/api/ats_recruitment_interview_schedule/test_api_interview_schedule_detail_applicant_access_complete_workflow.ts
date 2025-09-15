import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewSchedule";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Complete E2E: Applicant interview schedule detail retrieval with error cases.
 *
 * 1. Register applicant and get token
 * 2. Register HR recruiter and get token
 * 3. (Assume an application ID for the applicant)
 * 4. HR recruiter creates an interview for the applicant
 * 5. HR recruiter creates a schedule slot for the interview
 * 6. Switch to applicant role (login if needed)
 * 7. Applicant fetches schedule details – verify expected fields
 * 8. Negative path: applicant tries unrelated/interview schedule, wrong IDs,
 *    deleted/cancelled slots
 */
export async function test_api_interview_schedule_detail_applicant_access_complete_workflow(
  connection: api.IConnection,
) {
  // 1. Register applicant
  const applicantEmail = typia.random<string & tags.Format<"email">>();
  const applicantPassword = RandomGenerator.alphaNumeric(10);
  const applicant: IAtsRecruitmentApplicant.IAuthorized =
    await api.functional.auth.applicant.join(connection, {
      body: {
        email: applicantEmail,
        password: applicantPassword,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IAtsRecruitmentApplicant.ICreate,
    });
  typia.assert(applicant);

  // 2. Register HR recruiter
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);
  const hr: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: hrEmail,
        password: hrPassword,
        name: RandomGenerator.name(),
        department: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(hr);

  // 3. (Application creation is not in the scope, so we generate an application ID for the interview)
  // In a real E2E: This would be created via an API. Here, we simulate.
  const applicationId = typia.random<string & tags.Format<"uuid">>();

  // 4. HR recruiter creates an interview
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const interviewCreateBody = {
    ats_recruitment_application_id: applicationId,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    stage: RandomGenerator.pick([
      "first_phase",
      "tech_round",
      "final",
    ] as const),
    status: RandomGenerator.pick(["scheduled", "pending"] as const),
    notes: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IAtsRecruitmentInterview.ICreate;
  const interview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      { body: interviewCreateBody },
    );
  typia.assert(interview);

  // 5. HR recruiter creates a schedule slot for the interview
  const now = new Date();
  const scheduleBody = {
    ats_recruitment_interview_id: interview.id,
    start_at: new Date(now.getTime() + 6 * 3600 * 1000).toISOString(), // 6h later
    end_at: new Date(now.getTime() + 7 * 3600 * 1000).toISOString(), // 7h later
    timezone: "Asia/Seoul",
    schedule_source: "manual",
    schedule_status: RandomGenerator.pick(["proposed", "confirmed"] as const),
    cancellation_reason: null,
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

  // 6. Applicant logs in (switch to applicant role)
  await api.functional.auth.applicant.login(connection, {
    body: {
      email: applicantEmail,
      password: applicantPassword,
    } satisfies IAtsRecruitmentApplicant.ILogin,
  });

  // 7. Applicant accesses schedule detail via interviewId/scheduleId
  const output =
    await api.functional.atsRecruitment.applicant.interviews.schedules.at(
      connection,
      {
        interviewId: interview.id,
        scheduleId: schedule.id,
      },
    );
  typia.assert(output);
  TestValidator.equals("schedule id should match", output.id, schedule.id);
  TestValidator.equals(
    "interview id should match",
    output.ats_recruitment_interview_id,
    interview.id,
  );
  TestValidator.equals(
    "timezone should match",
    output.timezone,
    scheduleBody.timezone,
  );
  TestValidator.equals(
    "schedule status matches",
    output.schedule_status,
    scheduleBody.schedule_status,
  );
  TestValidator.equals(
    "start_at match",
    output.start_at,
    scheduleBody.start_at,
  );
  TestValidator.equals("end_at match", output.end_at, scheduleBody.end_at);

  // 8. Negative: applicant fetches unrelated schedule (simulate with new UUIDs)
  await TestValidator.error(
    "applicant cannot access unrelated schedule",
    async () => {
      await api.functional.atsRecruitment.applicant.interviews.schedules.at(
        connection,
        {
          interviewId: typia.random<string & tags.Format<"uuid">>(),
          scheduleId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 9. Negative: applicant uses fake scheduleId for valid interviewId
  await TestValidator.error(
    "applicant cannot access fake schedule with correct interview",
    async () => {
      await api.functional.atsRecruitment.applicant.interviews.schedules.at(
        connection,
        {
          interviewId: interview.id,
          scheduleId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
