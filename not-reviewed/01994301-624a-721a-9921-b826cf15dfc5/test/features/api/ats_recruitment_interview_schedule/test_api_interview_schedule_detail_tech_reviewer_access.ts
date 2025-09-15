import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewParticipant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewParticipant";
import type { IAtsRecruitmentInterviewSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewSchedule";
import type { IAtsRecruitmentTechReviewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentTechReviewer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * This scenario verifies that a technical reviewer can access the details for
 * an interview schedule they are assigned to, while validating role-based and
 * ID-based access control. The test:
 *
 * 1. Registers and authenticates a technical reviewer and HR recruiter.
 * 2. HR recruiter creates an interview and adds the reviewer as a participant.
 * 3. HR recruiter creates a schedule for the interview.
 * 4. Technical reviewer logs in and fetches detailed schedule information,
 *    verifying correctness.
 * 5. Negative tests: a) Reviewer attempts to access a schedule for an interview
 *    they are NOT assigned to. b) Reviewer accesses schedules with bogus
 *    interview/schedule IDs.
 *
 * Steps ensure schedule can only be fetched by assigned participants and all
 * access control, business, and data integrity rules are enforced end to end.
 */
export async function test_api_interview_schedule_detail_tech_reviewer_access(
  connection: api.IConnection,
) {
  // 1. Tech reviewer registration
  const techReviewerEmail = typia.random<string & tags.Format<"email">>();
  const techReviewerPassword = RandomGenerator.alphaNumeric(12);
  const techReviewer = await api.functional.auth.techReviewer.join(connection, {
    body: {
      email: techReviewerEmail,
      password: techReviewerPassword,
      name: RandomGenerator.name(),
      specialization: RandomGenerator.pick([
        "backend",
        "frontend",
        "devops",
      ]) as string,
    } satisfies IAtsRecruitmentTechReviewer.ICreate,
  });
  typia.assert(techReviewer);

  // 2. HR recruiter registration
  const hrEmail = typia.random<string & tags.Format<"email">>();
  const hrPassword = RandomGenerator.alphaNumeric(12);
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.pick(["HR", "Recruitment", "People"]),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(hrRecruiter);

  // Switch to HR recruiter
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });

  // Simulate application id needed for interview
  const applicationId = typia.random<string & tags.Format<"uuid">>();

  // 3. HR creates an interview
  const interviewCreate = {
    ats_recruitment_application_id: applicationId,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    stage: RandomGenerator.pick(["tech_round", "final", "hr"]),
    status: "scheduled",
    notes: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IAtsRecruitmentInterview.ICreate;
  const interview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: interviewCreate,
      },
    );
  typia.assert(interview);

  // 4. HR adds the reviewer as participant
  const participant =
    await api.functional.atsRecruitment.hrRecruiter.interviews.participants.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          ats_recruitment_techreviewer_id: techReviewer.id,
          role: "reviewer",
          confirmation_status: "accepted",
        } satisfies IAtsRecruitmentInterviewParticipant.ICreate,
      },
    );
  typia.assert(participant);

  // 5. HR creates a schedule for the interview
  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const end = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
  const schedule =
    await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.create(
      connection,
      {
        interviewId: interview.id,
        body: {
          ats_recruitment_interview_id: interview.id,
          start_at: start as string & tags.Format<"date-time">,
          end_at: end as string & tags.Format<"date-time">,
          timezone: "Asia/Seoul",
          schedule_source: "manual",
          schedule_status: "confirmed",
        } satisfies IAtsRecruitmentInterviewSchedule.ICreate,
      },
    );
  typia.assert(schedule);

  // 6. Tech reviewer logs in
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: techReviewerEmail,
      password: techReviewerPassword,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });

  // 7. Reviewer fetches their schedule (happy path)
  const fetched =
    await api.functional.atsRecruitment.techReviewer.interviews.schedules.at(
      connection,
      {
        interviewId: interview.id,
        scheduleId: schedule.id,
      },
    );
  typia.assert(fetched);
  TestValidator.equals("schedule.id matches", fetched.id, schedule.id);
  TestValidator.equals(
    "schedule.interview id matches",
    fetched.ats_recruitment_interview_id,
    schedule.ats_recruitment_interview_id,
  );
  TestValidator.equals(
    "schedule start_at matches",
    fetched.start_at,
    schedule.start_at,
  );
  TestValidator.equals(
    "schedule end_at matches",
    fetched.end_at,
    schedule.end_at,
  );
  TestValidator.equals(
    "schedule timezone matches",
    fetched.timezone,
    schedule.timezone,
  );
  TestValidator.equals(
    "schedule status matches",
    fetched.schedule_status,
    schedule.schedule_status,
  );

  // 8a. Negative: Reviewer tries to fetch schedule for another interview
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: hrEmail,
      password: hrPassword,
    } satisfies IAtsRecruitmentHrRecruiter.ILogin,
  });
  const otherInterview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          stage: "hr",
          status: "scheduled",
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(otherInterview);
  const otherSchedule =
    await api.functional.atsRecruitment.hrRecruiter.interviews.schedules.create(
      connection,
      {
        interviewId: otherInterview.id,
        body: {
          ats_recruitment_interview_id: otherInterview.id,
          start_at: new Date(
            now.getTime() + 3 * 60 * 60 * 1000,
          ).toISOString() as string & tags.Format<"date-time">,
          end_at: new Date(
            now.getTime() + 4 * 60 * 60 * 1000,
          ).toISOString() as string & tags.Format<"date-time">,
          timezone: "Asia/Seoul",
          schedule_source: "manual",
          schedule_status: "confirmed",
        } satisfies IAtsRecruitmentInterviewSchedule.ICreate,
      },
    );
  typia.assert(otherSchedule);
  await api.functional.auth.techReviewer.login(connection, {
    body: {
      email: techReviewerEmail,
      password: techReviewerPassword,
    } satisfies IAtsRecruitmentTechReviewer.ILogin,
  });
  await TestValidator.error(
    "tech reviewer cannot access schedule they are not assigned to",
    async () => {
      await api.functional.atsRecruitment.techReviewer.interviews.schedules.at(
        connection,
        {
          interviewId: otherInterview.id,
          scheduleId: otherSchedule.id,
        },
      );
    },
  );

  // 8b. Negative: Bogus interview and schedule IDs
  const wrongId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "tech reviewer cannot access with wrong interviewId",
    async () => {
      await api.functional.atsRecruitment.techReviewer.interviews.schedules.at(
        connection,
        {
          interviewId: wrongId,
          scheduleId: schedule.id,
        },
      );
    },
  );
  await TestValidator.error(
    "tech reviewer cannot access with wrong scheduleId",
    async () => {
      await api.functional.atsRecruitment.techReviewer.interviews.schedules.at(
        connection,
        {
          interviewId: interview.id,
          scheduleId: wrongId,
        },
      );
    },
  );
}
