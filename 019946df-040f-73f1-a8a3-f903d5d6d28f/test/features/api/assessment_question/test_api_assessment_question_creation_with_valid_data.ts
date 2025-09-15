import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessmentQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentQuestion";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";

/**
 * End-to-end test for creating an assessment question as a
 * contentCreatorInstructor user.
 *
 * This test covers the entire flow from registration, login to the creation
 * of an assessment question. It validates that the returned question
 * contains the expected properties with accurate values and formats.
 *
 * Steps:
 *
 * 1. Register a new contentCreatorInstructor with a valid tenant id.
 * 2. Login as the created contentCreatorInstructor to obtain tokens.
 * 3. Create an assessment question with valid properties under a given
 *    assessment ID.
 * 4. Verify response properties including timestamps and UUID.
 */
export async function test_api_assessment_question_creation_with_valid_data(
  connection: api.IConnection,
) {
  // Step 1: Register a new contentCreatorInstructor
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email =
    RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 })
      .toLowerCase()
      .replace(/\s+/g, "") + "@example.com";
  const password = RandomGenerator.alphaNumeric(16);
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  const status = "active";

  const joinBody = {
    tenant_id: tenantId,
    email: email,
    password_hash: password,
    first_name: firstName,
    last_name: lastName,
    status: status,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const createdUser = await api.functional.auth.contentCreatorInstructor.join(
    connection,
    { body: joinBody },
  );
  typia.assert(createdUser);

  // Step 2: Login with the created contentCreatorInstructor
  const loginBody = {
    email: email,
    password: password,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;

  const loggedInUser = await api.functional.auth.contentCreatorInstructor.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loggedInUser);

  // Step 3: Create an assessment question
  const assessmentId = typia.random<string & tags.Format<"uuid">>();
  const validQuestionTypes = [
    "multiple choice",
    "true/false",
    "essay",
    "practical",
  ] as const;
  const questionText = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 15,
  });
  const questionType = RandomGenerator.pick(validQuestionTypes);
  const weight = Math.round(Math.random() * 100) / 10 + 1;

  const createBody = {
    assessment_id: assessmentId,
    question_text: questionText,
    question_type: questionType,
    weight: weight,
  } satisfies IEnterpriseLmsAssessmentQuestion.ICreate;

  const createdQuestion =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.questions.create(
      connection,
      {
        assessmentId: assessmentId,
        body: createBody,
      },
    );
  typia.assert(createdQuestion);

  // Step 4: Validate the returned question properties
  TestValidator.equals(
    "assessmentId matches",
    createdQuestion.assessment_id,
    assessmentId,
  );
  TestValidator.equals(
    "questionText matches",
    createdQuestion.question_text,
    createBody.question_text,
  );
  TestValidator.equals(
    "questionType matches",
    createdQuestion.question_type,
    createBody.question_type,
  );
  TestValidator.equals(
    "weight matches",
    createdQuestion.weight,
    createBody.weight,
  );
  TestValidator.predicate(
    "id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      createdQuestion.id,
    ),
  );
  TestValidator.predicate(
    "createdAt is ISO date",
    !Number.isNaN(Date.parse(createdQuestion.created_at)),
  );
  TestValidator.predicate(
    "updatedAt is ISO date",
    !Number.isNaN(Date.parse(createdQuestion.updated_at)),
  );
}
