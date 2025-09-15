import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentApplicant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentApplicant";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewSchedule";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate full system administrator access to interview schedule slot
 * details in all phases.
 *
 * This test simulates the following workflow for ATS interview schedules:
 *
 * 1. Register a new system admin and authenticate to establish elevated
 *    viewing capability.
 * 2. Register a new HR recruiter.
 * 3. Register a new applicant.
 * 4. Log in as HR recruiter and create a new interview for the applicant.
 *
 *    - Interview will reference a mock application ID and a plausible pipeline
 *         stage.
 * 5. HR recruiter creates a new interview schedule slot with required date
 *    range, timezone, and source/status.
 * 6. Log in as system admin (switch context if required).
 * 7. System admin fetches schedule slot details for the specific interview (by
 *    interviewId & scheduleId).
 *
 *    - Validate key schedule fields (start, end, timezone, status, source).
 * 8. Negative: Try fetching with random/invalid interviewId or scheduleId and
 *    confirm error is thrown.
 * 9. (Optional) Negative: Try after simulating deletion/cancellation (if API
 *    allows) and ensure error. Otherwise, skip or comment this part.
 */
export async function test_api_interview_schedule_detail_system_admin_access_full_lifecycle(
  connection: api.IConnection,
) {
  // 1. Register a new system admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      super_admin: true,
    } satisfies IAtsRecruitmentSystemAdmin.ICreate,
  });
  typia.assert(systemAdmin);

  // 2. Register a new HR recruiter
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiterPassword = RandomGenerator.alphaNumeric(12);
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.name(1),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter);

  // 3. Register a new applicant
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

  // 4. HR recruiter logs in
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // 5. HR recruiter creates a new interview for the applicant
  const mockApplicationId = typia.random<string & tags.Format<"uuid">>();
  const interview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: mockApplicationId,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          stage: "first_phase",
          status: "scheduled",
          notes: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interview);

  // 6. HR recruiter creates a schedule slot for this interview
  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1hr later
  const end = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(); // 2hr later
  const schedule =
    await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          start_at: start,
          end_at: end,
          timezone: "Asia/Seoul",
          schedule_source: "manual",
          schedule_status: "proposed",
          cancellation_reason: null,
        } satisfies IAtsRecruitmentInterviewSchedule.ICreate,
      },
    );
  typia.assert(schedule);

  // 7. Log in again as system admin to ensure admin context
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAtsRecruitmentSystemAdmin.ILogin,
  });

  // 8. Fetch schedule slot details as system admin
  const detail =
    await api.functional.atsRecruitment.systemAdmin.interviews.schedules.at(
      connection,
      {
        interviewId: interview.id,
        scheduleId: schedule.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals("schedule id matches", detail.id, schedule.id);
  TestValidator.equals(
    "parent interview id matches",
    detail.ats_recruitment_interview_id,
    interview.id,
  );
  TestValidator.equals("start time matches", detail.start_at, start);
  TestValidator.equals("end time matches", detail.end_at, end);
  TestValidator.equals("timezone matches", detail.timezone, "Asia/Seoul");
  TestValidator.equals(
    "schedule status matches",
    detail.schedule_status,
    "proposed",
  );
  TestValidator.equals(
    "schedule source matches",
    detail.schedule_source,
    "manual",
  );

  // 9. Negative: Attempt fetch with invalid interviewId
  await TestValidator.error(
    "fetch with invalid interviewId fails",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.schedules.at(
        connection,
        {
          interviewId: typia.random<string & tags.Format<"uuid">>(),
          scheduleId: schedule.id,
        },
      );
    },
  );

  // 10. Negative: Attempt fetch with invalid scheduleId
  await TestValidator.error("fetch with invalid scheduleId fails", async () => {
    await api.functional.atsRecruitment.systemAdmin.interviews.schedules.at(
      connection,
      {
        interviewId: interview.id,
        scheduleId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // Optionally test fetch on deleted/cancelled if API supports; skipped here as flow doesn't expose
}
