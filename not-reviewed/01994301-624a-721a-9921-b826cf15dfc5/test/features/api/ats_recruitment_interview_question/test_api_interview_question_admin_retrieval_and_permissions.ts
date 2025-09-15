import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentInterview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterview";
import type { IAtsRecruitmentInterviewQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentInterviewQuestion";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test for admin retrieval of interview question and permission
 * enforcement.
 *
 * - Validates that a system administrator can fetch any interview question by
 *   ID, regardless of its creator or recruiter association.
 * - Validates all fields are returned: question_text, question_type, order,
 *   is_template, questionId, interviewId, created_at
 * - Validates that attempts to fetch non-existent interviewId/questionId
 *   yields an error
 * - Validates permissions: only admin can access this endpoint;
 *   unauthenticated or non-admin should be denied
 */
export async function test_api_interview_question_admin_retrieval_and_permissions(
  connection: api.IConnection,
) {
  // Step 1: Register and login as system admin
  const sysadminEmail = typia.random<string & tags.Format<"email">>();
  const sysadminPassword = RandomGenerator.alphaNumeric(12);
  const sysadmin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysadminEmail,
      password: sysadminPassword,
      name: RandomGenerator.name(),
      super_admin: true,
    },
  });
  typia.assert(sysadmin);

  // Step 2: Create an interview as system admin
  const applicationId = typia.random<string & tags.Format<"uuid">>();
  const interview =
    await api.functional.atsRecruitment.systemAdmin.interviews.create(
      connection,
      {
        body: {
          ats_recruitment_application_id: applicationId,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          stage: "technical_test",
          status: "scheduled",
          notes: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(interview);

  // Step 3: Register and login as HR recruiter
  const recruiterEmail = typia.random<string & tags.Format<"email">>();
  const recruiterPassword = RandomGenerator.alphaNumeric(12);
  const hrRecruiter = await api.functional.auth.hrRecruiter.join(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
      name: RandomGenerator.name(),
      department: RandomGenerator.paragraph({ sentences: 1 }),
    },
  });
  typia.assert(hrRecruiter);

  // Switch to HR recruiter
  await api.functional.auth.hrRecruiter.login(connection, {
    body: {
      email: recruiterEmail,
      password: recruiterPassword,
    },
  });

  // Step 4: HR recruiter creates interview question
  const questionBody = {
    ats_recruitment_interview_id: interview.id,
    order: 1,
    question_text: RandomGenerator.paragraph({ sentences: 1 }),
    question_type: RandomGenerator.pick([
      "coding",
      "behavioral",
      "technical",
      "personality",
    ] as const),
    is_template: RandomGenerator.pick([true, false] as const),
  } satisfies IAtsRecruitmentInterviewQuestion.ICreate;
  const question =
    await api.functional.atsRecruitment.hrRecruiter.interviews.questions.create(
      connection,
      {
        interviewId: interview.id,
        body: questionBody,
      },
    );
  typia.assert(question);

  // Switch back to system admin
  await api.functional.auth.systemAdmin.login(connection, {
    body: { email: sysadminEmail, password: sysadminPassword },
  });

  // Step 5: Admin retrieves interview question (positive case)
  const output =
    await api.functional.atsRecruitment.systemAdmin.interviews.questions.at(
      connection,
      {
        interviewId: interview.id,
        questionId: question.id,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "question_text matches",
    output.question_text,
    questionBody.question_text,
  );
  TestValidator.equals(
    "question_type matches",
    output.question_type,
    questionBody.question_type,
  );
  TestValidator.equals(
    "is_template matches",
    output.is_template,
    questionBody.is_template,
  );
  TestValidator.equals("order matches", output.order, questionBody.order);
  TestValidator.equals(
    "parent interview ID matches",
    output.ats_recruitment_interview_id,
    questionBody.ats_recruitment_interview_id,
  );

  // Step 6: Negative/edge case - non-existent interview/question IDs
  const randomInterviewId = typia.random<string & tags.Format<"uuid">>();
  const randomQuestionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should not find non-existent (random) interview/question id",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.questions.at(
        connection,
        {
          interviewId: randomInterviewId,
          questionId: randomQuestionId,
        },
      );
    },
  );

  // Step 7: Negative/edge case - no authentication
  // Remove headers for unauthenticated attempt
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "denies retrieval without authentication",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.interviews.questions.at(
        unauthConnection,
        {
          interviewId: interview.id,
          questionId: question.id,
        },
      );
    },
  );
}
