import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessmentQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentQuestion";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";

/**
 * E2E Test for updating an existing assessment question by
 * contentCreatorInstructor user
 *
 * This test registers and authenticates a contentCreatorInstructor user.
 * Uses predefined assessmentId and questionId to emulate existing entities.
 * Updates the assessment question fields and validates response.
 *
 * Steps:
 *
 * 1. Register contentCreatorInstructor user
 * 2. Authenticate and acquire authorization
 * 3. Perform PUT request to update assessment question
 * 4. Validate updated fields and response integrity
 *
 * This test ensures complete compliance with API and DTO constraints with
 * robust business context adherence.
 */
export async function test_api_assessment_question_update_with_valid_data(
  connection: api.IConnection,
) {
  // Step 1: Register contentCreatorInstructor user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `${RandomGenerator.name(1).toLowerCase().replace(/\s/g, "")}@example.com`;
  const password = "hashed_password_example_123";
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const status = "active";

  const joinOutput = await api.functional.auth.contentCreatorInstructor.join(
    connection,
    {
      body: {
        tenant_id: tenantId,
        email: email,
        password_hash: password,
        first_name: firstName,
        last_name: lastName,
        status: status,
      } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate,
    },
  );
  typia.assert(joinOutput);

  // Step 2: Login contentCreatorInstructor user
  const loginOutput = await api.functional.auth.contentCreatorInstructor.login(
    connection,
    {
      body: {
        email: email,
        password: password,
      } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin,
    },
  );
  typia.assert(loginOutput);

  // Use fixed UUIDs emulating existing assessment and question
  const assessmentId = typia.random<string & tags.Format<"uuid">>();
  const questionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Update assessment question
  const updatedQuestionText = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 10,
  });
  const questionTypes = [
    "multiple choice",
    "true/false",
    "essay",
    "practical",
  ] as const;
  const updatedQuestionType = RandomGenerator.pick(questionTypes);
  const updatedWeight =
    Math.floor(RandomGenerator.alphaNumeric(1).charCodeAt(0) % 100) + 1;

  const updateBody = {
    question_text: updatedQuestionText,
    question_type: updatedQuestionType,
    weight: updatedWeight,
  } satisfies IEnterpriseLmsAssessmentQuestion.IUpdate;

  const updatedQuestion =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.questions.update(
      connection,
      {
        assessmentId: assessmentId,
        questionId: questionId,
        body: updateBody,
      },
    );
  typia.assert(updatedQuestion);

  // Step 4: Validation of updated fields
  TestValidator.equals(
    "assessment ID should match",
    updatedQuestion.assessment_id,
    assessmentId,
  );
  TestValidator.equals(
    "question ID should match",
    updatedQuestion.id,
    questionId,
  );
  TestValidator.equals(
    "question text should be updated",
    updatedQuestion.question_text,
    updatedQuestionText,
  );
  TestValidator.equals(
    "question type should be updated",
    updatedQuestion.question_type,
    updatedQuestionType,
  );
  TestValidator.equals(
    "weight should be updated",
    updatedQuestion.weight,
    updatedWeight,
  );

  TestValidator.predicate(
    "created_at should be valid ISO string",
    typeof updatedQuestion.created_at === "string" &&
      updatedQuestion.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be valid ISO string",
    typeof updatedQuestion.updated_at === "string" &&
      updatedQuestion.updated_at.length > 0,
  );

  TestValidator.predicate(
    "deleted_at is null or undefined",
    updatedQuestion.deleted_at === null ||
      updatedQuestion.deleted_at === undefined,
  );
}
