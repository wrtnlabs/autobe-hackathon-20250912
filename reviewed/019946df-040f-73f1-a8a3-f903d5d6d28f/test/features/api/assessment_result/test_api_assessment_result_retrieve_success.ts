import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentResult";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsContentCreatorInstructor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsContentCreatorInstructor";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";

/**
 * Test the retrieval of detailed information for an existing assessment result
 * by given assessmentId and resultId.
 *
 * This test performs a complete workflow involving authentication of both
 * corporateLearner and contentCreatorInstructor, creation of an assessment,
 * creation of an assessment result linked to the corporateLearner, and finally
 * retrieves and validates the assessment result details.
 *
 * It further tests error scenarios for unauthorized access and non-existent
 * resources to ensure robust API behavior.
 */
export async function test_api_assessment_result_retrieve_success(
  connection: api.IConnection,
) {
  // 1. CorporateLearner Signup
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const corporateLearnerEmail = `user${RandomGenerator.alphaNumeric(6)}@example.com`;
  const corporateLearnerPassword = "StrongPass123!";

  const corporateLearnerCreateBody = {
    tenant_id: tenantId,
    email: corporateLearnerEmail,
    password: corporateLearnerPassword,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const corporateLearnerJoin: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: corporateLearnerCreateBody,
    });
  typia.assert(corporateLearnerJoin);

  // 2. CorporateLearner Login
  const corporateLearnerLoginBody = {
    email: corporateLearnerEmail,
    password: corporateLearnerPassword,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;

  const corporateLearnerLogin: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: corporateLearnerLoginBody,
    });
  typia.assert(corporateLearnerLogin);

  // 3. ContentCreatorInstructor Signup
  const contentCreatorTenantId = tenantId; // Same tenant assumed
  const contentCreatorEmail = `instructor${RandomGenerator.alphaNumeric(6)}@example.com`;
  const contentCreatorPassword = "StrongPass123!";

  const contentCreatorCreateBody = {
    tenant_id: contentCreatorTenantId,
    email: contentCreatorEmail,
    password_hash: RandomGenerator.alphaNumeric(32), // realistic hashed string
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsContentCreatorInstructor.ICreate;

  const contentCreatorJoin: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.join(connection, {
      body: contentCreatorCreateBody,
    });
  typia.assert(contentCreatorJoin);

  // 4. ContentCreatorInstructor Login
  const contentCreatorLoginBody = {
    email: contentCreatorEmail,
    password: contentCreatorPassword,
  } satisfies IEnterpriseLmsContentCreatorInstructor.ILogin;

  const contentCreatorLogin: IEnterpriseLmsContentCreatorInstructor.IAuthorized =
    await api.functional.auth.contentCreatorInstructor.login(connection, {
      body: contentCreatorLoginBody,
    });
  typia.assert(contentCreatorLogin);

  // 5. Create Assessment
  const assessmentCreateBody = {
    tenant_id: tenantId,
    code: `code-${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.name(2),
    description: "A sample assessment description.",
    assessment_type: "quiz",
    max_score: 100,
    passing_score: 60,
    scheduled_start_at: new Date().toISOString(),
    scheduled_end_at: new Date(Date.now() + 3600 * 1000 * 24).toISOString(),
    status: "active",
  } satisfies IEnterpriseLmsAssessments.ICreate;

  const createdAssessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.contentCreatorInstructor.assessments.create(
      connection,
      {
        body: assessmentCreateBody,
      },
    );
  typia.assert(createdAssessment);

  // Switch authentication back to corporateLearner (simulate role switch)
  await api.functional.auth.corporateLearner.login(connection, {
    body: corporateLearnerLoginBody,
  });

  // 6. Create Assessment Result
  const assessmentResultCreateBody = {
    assessment_id: createdAssessment.id,
    learner_id: corporateLearnerJoin.id,
    score: 85,
    completed_at: new Date().toISOString(),
    status: "completed",
  } satisfies IEnterpriseLmsAssessmentResult.ICreate;

  const createdAssessmentResult: IEnterpriseLmsAssessmentResult =
    await api.functional.enterpriseLms.corporateLearner.assessments.results.create(
      connection,
      {
        assessmentId: createdAssessment.id,
        body: assessmentResultCreateBody,
      },
    );
  typia.assert(createdAssessmentResult);

  // 7. Retrieve Assessment Result
  const retrievedResult: IEnterpriseLmsAssessmentResult =
    await api.functional.enterpriseLms.corporateLearner.assessments.results.at(
      connection,
      {
        assessmentId: createdAssessment.id,
        resultId: createdAssessmentResult.id,
      },
    );
  typia.assert(retrievedResult);

  // 8. Validate that the retrieved data matches the created result
  TestValidator.equals(
    "assessment result id",
    retrievedResult.id,
    createdAssessmentResult.id,
  );
  TestValidator.equals(
    "assessment result assessmentId",
    retrievedResult.assessment_id,
    createdAssessmentResult.assessment_id,
  );
  TestValidator.equals(
    "assessment result learnerId",
    retrievedResult.learner_id,
    createdAssessmentResult.learner_id,
  );
  TestValidator.equals(
    "assessment result score",
    retrievedResult.score,
    createdAssessmentResult.score,
  );
  TestValidator.equals(
    "assessment result completedAt",
    retrievedResult.completed_at,
    createdAssessmentResult.completed_at,
  );
  TestValidator.equals(
    "assessment result status",
    retrievedResult.status,
    createdAssessmentResult.status,
  );

  // 9. Validate Unauthorized Access causes error
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthorized retrieval should fail", async () => {
    await api.functional.enterpriseLms.corporateLearner.assessments.results.at(
      unauthenticatedConnection,
      {
        assessmentId: createdAssessment.id,
        resultId: createdAssessmentResult.id,
      },
    );
  });

  // 10. Validate 404 when accessing non-existent result
  await TestValidator.error(
    "retrieval of non-existent assessment result should fail",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.assessments.results.at(
        connection,
        {
          assessmentId: typia.random<string & tags.Format<"uuid">>(),
          resultId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
