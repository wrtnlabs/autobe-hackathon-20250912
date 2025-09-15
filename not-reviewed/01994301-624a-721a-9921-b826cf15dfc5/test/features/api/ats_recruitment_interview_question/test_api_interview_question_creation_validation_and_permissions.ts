import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewQuestion";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates creation, error cases, and permission boundaries for interview
 * question creation.
 *
 * Covers:
 *
 * 1. Recruiter join (auth)
 * 2. Interview creation
 * 3. Happy path: valid question creation and validation
 * 4. Error: duplicate order
 * 5. Error: non-existent interviewId
 * 6. Permission: only authenticated recruiter can create questions (simulate
 *    switch to unauthenticated)
 */
export async function test_api_interview_question_creation_validation_and_permissions(
  connection: api.IConnection,
) {
  // 1. HR recruiter registration/login
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiter: IAtsRecruitmentHrRecruiter.IAuthorized =
    await api.functional.auth.hrRecruiter.join(connection, {
      body: {
        email: recruiterEmail,
        password: "Secure!passw0rd",
        name: RandomGenerator.name(),
        department: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IAtsRecruitmentHrRecruiter.IJoin,
    });
  typia.assert(recruiter);
  TestValidator.equals(
    "Recruiter email matches",
    recruiter.email,
    recruiterEmail,
  );

  // 2. Interview creation (requires fake application id: random uuid)
  const interviewBody = {
    ats_recruitment_application_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    stage: RandomGenerator.pick([
      "first_phase",
      "tech_round",
      "hr_final",
    ] as const),
    status: RandomGenerator.pick([
      "scheduled",
      "pending",
      "completed",
      "cancelled",
    ] as const),
    notes: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IAtsRecruitmentInterview.ICreate;
  const interview: IAtsRecruitmentInterview =
    await api.functional.atsRecruitment.hrRecruiter.interviews.create(
      connection,
      { body: interviewBody },
    );
  typia.assert(interview);
  TestValidator.equals(
    "interview application id matches",
    interview.ats_recruitment_application_id,
    interviewBody.ats_recruitment_application_id,
  );
  TestValidator.equals(
    "interview stage matches",
    interview.stage,
    interviewBody.stage,
  );

  // 3. Happy path: valid question creation
  const questionBody = {
    ats_recruitment_interview_id: interview.id,
    order: 1,
    question_text: RandomGenerator.paragraph({ sentences: 2 }),
    question_type: RandomGenerator.pick([
      "coding",
      "behavioral",
      "technical",
      "personality",
    ] as const),
    is_template: RandomGenerator.pick([true, false]),
  } satisfies IAtsRecruitmentInterviewQuestion.ICreate;
  const question: IAtsRecruitmentInterviewQuestion =
    await api.functional.atsRecruitment.hrRecruiter.interviews.questions.create(
      connection,
      {
        interviewId: interview.id,
        body: questionBody,
      },
    );
  typia.assert(question);
  TestValidator.equals(
    "question interview id match",
    question.ats_recruitment_interview_id,
    interview.id,
  );
  TestValidator.equals("question order", question.order, questionBody.order);
  TestValidator.equals(
    "question content",
    question.question_text,
    questionBody.question_text,
  );
  TestValidator.equals(
    "question type",
    question.question_type,
    questionBody.question_type,
  );
  TestValidator.equals(
    "template flag",
    question.is_template,
    questionBody.is_template,
  );

  // 4. Error: duplicate order
  const duplicateOrderBody = {
    ats_recruitment_interview_id: interview.id,
    order: 1,
    question_text: RandomGenerator.paragraph({ sentences: 2 }),
    question_type: "behavioral",
    is_template: false,
  } satisfies IAtsRecruitmentInterviewQuestion.ICreate;
  await TestValidator.error("duplicate order fails", async () => {
    await api.functional.atsRecruitment.hrRecruiter.interviews.questions.create(
      connection,
      {
        interviewId: interview.id,
        body: duplicateOrderBody,
      },
    );
  });

  // 5. Error: non-existent interview ID
  const nonExistentIdBody = {
    ats_recruitment_interview_id: typia.random<string & tags.Format<"uuid">>(),
    order: 1,
    question_text: RandomGenerator.paragraph({ sentences: 1 }),
    question_type: "coding",
    is_template: false,
  } satisfies IAtsRecruitmentInterviewQuestion.ICreate;
  await TestValidator.error("non-existent interviewId fails", async () => {
    await api.functional.atsRecruitment.hrRecruiter.interviews.questions.create(
      connection,
      {
        interviewId: nonExistentIdBody.ats_recruitment_interview_id,
        body: nonExistentIdBody,
      },
    );
  });

  // 6. Permission: unauthenticated attempt (simulate unauth by emptying headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot create question",
    async () => {
      await api.functional.atsRecruitment.hrRecruiter.interviews.questions.create(
        unauthConn,
        {
          interviewId: interview.id,
          body: {
            ats_recruitment_interview_id: interview.id,
            order: 4,
            question_text: RandomGenerator.paragraph({ sentences: 2 }),
            question_type: "personality",
            is_template: false,
          } satisfies IAtsRecruitmentInterviewQuestion.ICreate,
        },
      );
    },
  );
}
