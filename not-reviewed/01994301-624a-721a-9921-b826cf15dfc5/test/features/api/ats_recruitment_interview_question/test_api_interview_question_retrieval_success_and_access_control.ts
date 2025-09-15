import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewQuestion";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test for interview question detail retrieval and access control for
 * HR recruiter.
 *
 * This function:
 *
 * 1. Registers and logs in a new HR recruiter.
 * 2. Creates a new interview.
 * 3. Adds a new question to the interview.
 * 4. Retrieves the question as the correct recruiter (should succeed, values
 *    match).
 * 5. Tries invalid interviewId/questionId (should error for not
 *    found/invalid).
 * 6. Tries to access question without authentication (should error for auth
 *    required).
 * 7. Registers another recruiter and attempts to access (should error for
 *    forbidden).
 */
export async function test_api_interview_question_retrieval_success_and_access_control(
  connection: api.IConnection,
) {
  // 1. Register HR recruiter
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterEmail,
      password: "password123",
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  typia.assert(recruiter);

  // 2. Create an interview
  const interview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          stage: RandomGenerator.pick([
            "first_phase",
            "technical",
            "hr_final",
          ]) as string,
          status: RandomGenerator.pick([
            "scheduled",
            "pending-review",
            "completed",
          ]) as string,
        } satisfies IAtsRecruitmentInterview.ICreate,
      },
    );
  typia.assert(interview);

  // 3. Create an interview question
  const questionInput = {
    ats_recruitment_interview_id: interview.id,
    order: 1,
    question_text: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 12,
    }),
    question_type: RandomGenerator.pick(["coding", "behavioral", "technical"]),
    is_template: RandomGenerator.pick([true, false]),
  } satisfies IAtsRecruitmentInterviewQuestion.ICreate;
  const createdQuestion =
    await api.functional.atsRecruitment.hrRecruiter.interviews.questions.create(
      connection,
      {
        interviewId: interview.id,
        body: questionInput,
      },
    );
  typia.assert(createdQuestion);

  // 4. Happy path: retrieve as the correct recruiter
  const fetched =
    await api.functional.atsRecruitment.hrRecruiter.interviews.questions.at(
      connection,
      {
        interviewId: interview.id,
        questionId: createdQuestion.id,
      },
    );
  typia.assert(fetched);
  // Validate all fields match what was created
  TestValidator.equals("question id matches", fetched.id, createdQuestion.id);
  TestValidator.equals(
    "interview id matches",
    fetched.ats_recruitment_interview_id,
    interview.id,
  );
  TestValidator.equals("order matches", fetched.order, questionInput.order);
  TestValidator.equals(
    "question text matches",
    fetched.question_text,
    questionInput.question_text,
  );
  TestValidator.equals(
    "question type matches",
    fetched.question_type,
    questionInput.question_type,
  );
  TestValidator.equals(
    "is_template matches",
    fetched.is_template,
    questionInput.is_template,
  );

  // 5. Error: invalid interviewId or questionId
  const fakeInterviewId = typia.random<string & tags.Format<"uuid">>();
  const fakeQuestionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("invalid interview id should fail", async () => {
    await api.functional.atsRecruitment.hrRecruiter.interviews.questions.at(
      connection,
      {
        interviewId: fakeInterviewId,
        questionId: createdQuestion.id,
      },
    );
  });
  await TestValidator.error("invalid question id should fail", async () => {
    await api.functional.atsRecruitment.hrRecruiter.interviews.questions.at(
      connection,
      {
        interviewId: interview.id,
        questionId: fakeQuestionId,
      },
    );
  });

  // 6. Error: unauthenticated access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access denied", async () => {
    await api.functional.atsRecruitment.hrRecruiter.interviews.questions.at(
      unauthConn,
      {
        interviewId: interview.id,
        questionId: createdQuestion.id,
      },
    );
  });

  // 7. Error: recruiter tries to access question from an interview they do not own
  const otherRecruiterEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: otherRecruiterEmail,
      password: "password456",
      name: RandomGenerator.name(),
    } satisfies IAtsRecruitmentHrRecruiter.IJoin,
  });
  // Recruiter is now switched to other recruiter
  await TestValidator.error(
    "unauthorized recruiter access denied",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.questions.at(
        connection,
        {
          interviewId: interview.id,
          questionId: createdQuestion.id,
        },
      );
    },
  );
}
