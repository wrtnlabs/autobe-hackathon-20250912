import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewQuestion";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate the update logic and access controls for interview questions in the
 * ATS.
 *
 * 1. Register and authenticate as HR recruiter (owner of resources).
 * 2. Create a new interview (provides a valid interviewId).
 * 3. Add two questions to the interview, with distinct order values.
 * 4. Update the first question's text, type, and swap order with second question
 *    (to check update and uniqueness logic).
 * 5. Validate the update response reflects the new values and new order, and that
 *    business constraints are enforced.
 * 6. Negative: Attempt update with a non-existent questionId (should fail).
 * 7. Negative: Attempt update with a non-existent interviewId (should fail).
 * 8. Negative: Attempt to update with missing or invalid data (should fail).
 * 9. Negative: Attempt to update as unauthenticated user (should fail).
 * 10. Negative: Attempt update as a different recruiter (should fail).
 * 11. Negative: Attempt to set duplicate order to existing question (should be
 *     rejected).
 * 12. (If possible) Negative: Attempt update when interview is in a locked or
 *     completed state (should fail).
 */
export async function test_api_interview_question_update_controls_and_validation(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as HR recruiter
  const recruiterJoin = await api.functional.auth.hrRecruiter.join(connection, {
    body: typia.random<IAtsRecruitmentHrRecruiter.IJoin>(),
  });
  typia.assert(recruiterJoin);
  const ownerEmail = recruiterJoin.email;

  // 2. Create new interview
  const interview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      {
        body: typia.random<IAtsRecruitmentInterview.ICreate>(),
      },
    );
  typia.assert(interview);

  // 3. Add two interview questions
  const baseOrder = typia.random<number & tags.Type<"int32">>();
  const q1Body = {
    ats_recruitment_interview_id: interview.id,
    order: baseOrder,
    question_text: RandomGenerator.paragraph(),
    question_type: "behavioral",
    is_template: false,
  } satisfies IAtsRecruitmentInterviewQuestion.ICreate;
  const question1 =
    await api.functional.atsRecruitment.hrRecruiter.interviews.questions.create(
      connection,
      {
        interviewId: interview.id,
        body: q1Body,
      },
    );
  typia.assert(question1);
  const q2Body = {
    ats_recruitment_interview_id: interview.id,
    order: baseOrder + 1,
    question_text: RandomGenerator.paragraph(),
    question_type: "coding",
    is_template: false,
  } satisfies IAtsRecruitmentInterviewQuestion.ICreate;
  const question2 =
    await api.functional.atsRecruitment.hrRecruiter.interviews.questions.create(
      connection,
      {
        interviewId: interview.id,
        body: q2Body,
      },
    );
  typia.assert(question2);

  // 4. Update Q1: change text, type, and swap order with Q2
  const updatedText = RandomGenerator.paragraph({ sentences: 4 });
  const updatedType = "technical";
  const updateBody = {
    question_text: updatedText,
    question_type: updatedType,
    order: question2.order,
  } satisfies IAtsRecruitmentInterviewQuestion.IUpdate;
  const updated =
    await api.functional.atsRecruitment.hrRecruiter.interviews.questions.update(
      connection,
      {
        interviewId: interview.id,
        questionId: question1.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated question id unchanged",
    updated.id,
    question1.id,
  );
  TestValidator.equals("text updated", updated.question_text, updatedText);
  TestValidator.equals("type updated", updated.question_type, updatedType);
  TestValidator.equals(
    "order updated to swapped",
    updated.order,
    question2.order,
  );

  // 5. Attempt invalid update: duplicate order (set same as updated Q1)
  await TestValidator.error("set duplicate order should fail", async () => {
    await api.functional.atsRecruitment.hrRecruiter.interviews.questions.update(
      connection,
      {
        interviewId: interview.id,
        questionId: question2.id,
        body: { order: updated.order },
      },
    );
  });

  // 6. Negative: Non-existent questionId
  await TestValidator.error("non-existent questionId", async () => {
    await api.functional.atsRecruitment.hrRecruiter.interviews.questions.update(
      connection,
      {
        interviewId: interview.id,
        questionId: typia.random<string & tags.Format<"uuid">>(),
        body: { question_text: "Should fail" },
      },
    );
  });

  // 7. Negative: Non-existent interviewId
  await TestValidator.error("non-existent interviewId", async () => {
    await api.functional.atsRecruitment.hrRecruiter.interviews.questions.update(
      connection,
      {
        interviewId: typia.random<string & tags.Format<"uuid">>(),
        questionId: question1.id,
        body: { question_text: "Should fail" },
      },
    );
  });

  // 8. Negative: invalid data (no update body supplied)
  await TestValidator.error("empty update body should fail", async () => {
    await api.functional.atsRecruitment.hrRecruiter.interviews.questions.update(
      connection,
      {
        interviewId: interview.id,
        questionId: question1.id,
        body: {} satisfies IAtsRecruitmentInterviewQuestion.IUpdate,
      },
    );
  });

  // 9. Negative: unauthenticated (simulate by clearing auth header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "update as unauthenticated user fails",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.questions.update(
        unauthConn,
        {
          interviewId: interview.id,
          questionId: question1.id,
          body: { question_text: "Fail update" },
        },
      );
    },
  );

  // 10. Negative: as different HR recruiter
  const otherRecruiter = await api.functional.auth.hrRecruiter.join(
    connection,
    {
      body: typia.random<IAtsRecruitmentHrRecruiter.IJoin>(),
    },
  );
  typia.assert(otherRecruiter);
  await TestValidator.error("update as non-owner fails", async () => {
    await api.functional.atsRecruitment.hrRecruiter.interviews.questions.update(
      connection,
      {
        interviewId: interview.id,
        questionId: question1.id,
        body: { question_text: "Not allowed" },
      },
    );
  });

  // 11. Negative: (business locked state)
  // This scenario typically requires interview status manipulation (e.g., manually updating status to completed/locked if allowed).
  // SKIPPED unless APIs for status update exist (not in provided SDK).
}
