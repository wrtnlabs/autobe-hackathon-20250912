import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessmentQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentQuestion";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

export async function test_api_systemadmin_assessment_question_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. SystemAdmin user joins (register)
  const sysAdminJoinRequestBody = {
    email: RandomGenerator.alphaNumeric(8) + "@test.com",
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;
  const systemAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminJoinRequestBody,
  });
  typia.assert(systemAdmin);

  // 2. SystemAdmin user logs in
  const sysAdminLoginRequestBody = {
    email: sysAdminJoinRequestBody.email,
    password_hash: sysAdminJoinRequestBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;
  const systemAdminLogin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: sysAdminLoginRequestBody,
    },
  );
  typia.assert(systemAdminLogin);

  // 3. Create new assessment
  const assessmentCreateRequestBody = {
    tenant_id: systemAdmin.tenant_id,
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 6 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    assessment_type: "quiz",
    max_score: 100,
    passing_score: 60,
    scheduled_start_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    scheduled_end_at: new Date(Date.now() + 3600 * 1000 * 24).toISOString(),
    status: "planned",
  } satisfies IEnterpriseLmsAssessments.ICreate;
  const assessment =
    await api.functional.enterpriseLms.systemAdmin.assessments.create(
      connection,
      {
        body: assessmentCreateRequestBody,
      },
    );
  typia.assert(assessment);

  // 4. ContentCreatorInstructor user joins
  const contentCreatorJoinRequestBody = {
    tenant_id: systemAdmin.tenant_id,
    email: RandomGenerator.alphaNumeric(8) + "@test.com",
    password_hash: RandomGenerator.alphaNumeric(16),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;
  const contentCreator =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: contentCreatorJoinRequestBody,
    });
  typia.assert(contentCreator);

  // 5. ContentCreatorInstructor user logs in
  const contentCreatorLoginRequestBody = {
    email: contentCreatorJoinRequestBody.email,
    password: contentCreatorJoinRequestBody.password_hash,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;
  const contentCreatorLogin =
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: contentCreatorLoginRequestBody,
    });
  typia.assert(contentCreatorLogin);

  // 6. ContentCreatorInstructor creates question
  const questionCreateRequestBody = {
    assessment_id: assessment.id,
    question_text: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 4,
      wordMax: 8,
    }),
    question_type: "multiple choice",
    weight: 10,
  } satisfies IEnterpriseLmsAssessmentQuestion.ICreate;
  const question =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.questions.create(
      connection,
      {
        assessmentId: assessment.id,
        body: questionCreateRequestBody,
      },
    );
  typia.assert(question);

  // 7. SystemAdmin retrieves question detail
  const questionDetail =
    await api.functional.enterpriseLms.systemAdmin.assessments.questions.at(
      connection,
      {
        assessmentId: assessment.id,
        questionId: question.id,
      },
    );
  typia.assert(questionDetail);

  // Validate fields
  TestValidator.equals(
    "question_text matches",
    questionDetail.question_text,
    questionCreateRequestBody.question_text,
  );
  TestValidator.equals(
    "question_type matches",
    questionDetail.question_type,
    questionCreateRequestBody.question_type,
  );
  TestValidator.equals(
    "weight matches",
    questionDetail.weight,
    questionCreateRequestBody.weight,
  );
  TestValidator.equals(
    "assessment_id matches",
    questionDetail.assessment_id,
    assessment.id,
  );

  // Validate timestamps presence
  TestValidator.predicate(
    "created_at is valid ISO string",
    typeof questionDetail.created_at === "string" &&
      questionDetail.created_at.length > 10,
  );
  TestValidator.predicate(
    "updated_at is valid ISO string",
    typeof questionDetail.updated_at === "string" &&
      questionDetail.updated_at.length > 10,
  );

  // 8. Unauthorized access test: contentCreatorInstructor tries to retrieve question -> expect error
  await api.functional.auth.contentCreatorInstructor.login(connection, {
    body: contentCreatorLoginRequestBody,
  });
  await TestValidator.error(
    "contentCreatorInstructor cannot access question detail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.questions.at(
        connection,
        {
          assessmentId: assessment.id,
          questionId: question.id,
        },
      );
    },
  );

  // 9. Unauthenticated access test: new connection with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot access question detail",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.questions.at(
        unauthConn,
        {
          assessmentId: assessment.id,
          questionId: question.id,
        },
      );
    },
  );

  // 10. Negative test: 404 for non-existent assessmentId
  await TestValidator.error(
    "non-existent assessmentId returns 404",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.questions.at(
        connection,
        {
          assessmentId: typia.random<string & tags.Format<"uuid">>(),
          questionId: question.id,
        },
      );
    },
  );

  // 11. Negative test: 404 for non-existent questionId
  await TestValidator.error("non-existent questionId returns 404", async () => {
    await api.functional.enterpriseLms.systemAdmin.assessments.questions.at(
      connection,
      {
        assessmentId: assessment.id,
        questionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
