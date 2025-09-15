import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessmentQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentQuestion";
import type { IEnterpriseLmsOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsOrganizationAdmin";

/**
 * This E2E test validates that an authorized organizationAdmin user can
 * successfully create a new assessment question linked to an existing
 * assessment in the Enterprise LMS system.
 *
 * The test covers the full user journey from account creation and login through
 * to performing the authorized API action and verifying the response data
 * integrity.
 *
 * It also tests an unauthorized failure scenario by attempting question
 * creation without authorization, expecting a failure.
 */
export async function test_api_assessment_question_creation_with_authorization(
  connection: api.IConnection,
) {
  // 1. Create organizationAdmin user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = typia.random<string & tags.Format<"email">>();
  const passwordPlain = "Password123!";
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  const orgAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: {
        tenant_id: tenantId,
        email: email,
        password: passwordPlain,
        first_name: firstName,
        last_name: lastName,
      } satisfies IEnterpriseLmsOrganizationAdmin.ICreate,
    });
  typia.assert(orgAdmin);

  // 2. Login as organizationAdmin
  const loginAdmin: IEnterpriseLmsOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.login(connection, {
      body: {
        email: email,
        password: passwordPlain,
      } satisfies IEnterpriseLmsOrganizationAdmin.ILogin,
    });
  typia.assert(loginAdmin);

  // 3. Prepare assessment ID (assumed existing)
  const assessmentId = typia.random<string & tags.Format<"uuid">>();

  // 4. Prepare question creation payload
  const questionText = "What is the capital of France?";
  const questionType = "multiple choice";
  const weight = 10;

  const requestBody = {
    assessment_id: assessmentId,
    question_text: questionText,
    question_type: questionType,
    weight: weight,
  } satisfies IEnterpriseLmsAssessmentQuestion.ICreate;

  // 5. Create question
  const createdQuestion: IEnterpriseLmsAssessmentQuestion =
    await api.functional.enterpriseLms.organizationAdmin.assessments.questions.create(
      connection,
      {
        assessmentId: assessmentId,
        body: requestBody,
      },
    );
  typia.assert(createdQuestion);

  // 6. Verify question data
  TestValidator.equals(
    "Question text matches input",
    createdQuestion.question_text,
    questionText,
  );
  TestValidator.equals(
    "Question type matches input",
    createdQuestion.question_type,
    questionType,
  );
  TestValidator.predicate("Weight is positive", createdQuestion.weight > 0);
  TestValidator.equals(
    "Assessment ID matches",
    createdQuestion.assessment_id,
    assessmentId,
  );

  // 7. Verify timestamps format
  TestValidator.predicate(
    "Created at is valid date-time string",
    typeof createdQuestion.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
        createdQuestion.created_at,
      ),
  );
  TestValidator.predicate(
    "Updated at is valid date-time string",
    typeof createdQuestion.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.*Z$/.test(
        createdQuestion.updated_at,
      ),
  );

  // 8. Unauthorized creation attempt (no auth)
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("Unauthorized creation denied", async () => {
    await api.functional.enterpriseLms.organizationAdmin.assessments.questions.create(
      unauthConn,
      {
        assessmentId: assessmentId,
        body: requestBody,
      },
    );
  });
}
