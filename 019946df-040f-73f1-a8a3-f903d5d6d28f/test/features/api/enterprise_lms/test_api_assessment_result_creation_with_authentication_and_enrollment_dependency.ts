import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessmentResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessmentResult";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsEnrollment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollment";

/**
 * E2E test for creation of an Enterprise LMS assessment result with full
 * authentication and enrollment dependencies.
 *
 * This test verifies the full workflow for a corporate learner registering,
 * logging in, enrolling into a learning path, and creating the associated
 * assessment result with validation of response integrity and consistency.
 */
export async function test_api_assessment_result_creation_with_authentication_and_enrollment_dependency(
  connection: api.IConnection,
) {
  // 1. Prepare tenant_id to use for learner registration
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Register a new corporate learner with tenant_id
  const corporateLearnerCreateBody = {
    tenant_id: tenantId,
    email: `${RandomGenerator.name(1).toLowerCase()}-${RandomGenerator.alphaNumeric(4)}@example.com`,
    password: "P@ssw0rd!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const corporateLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: corporateLearnerCreateBody,
    });
  typia.assert(corporateLearner);
  TestValidator.equals(
    "tenant_id should match in created corporate learner",
    corporateLearner.tenant_id,
    tenantId,
  );
  TestValidator.equals(
    "email should match in created corporate learner",
    corporateLearner.email,
    corporateLearnerCreateBody.email,
  );

  // 3. Authenticate the corporate learner to obtain tokens
  const corporateLearnerLoginBody = {
    email: corporateLearnerCreateBody.email,
    password: corporateLearnerCreateBody.password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;

  const authenticatedLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: corporateLearnerLoginBody,
    });
  typia.assert(authenticatedLearner);
  TestValidator.equals(
    "authenticated learner email matches",
    authenticatedLearner.email,
    corporateLearnerCreateBody.email,
  );

  // Confirm that the authorization token is set on the connection
  TestValidator.predicate(
    "authorization token string length greater than 10",
    connection.headers !== undefined &&
      typeof connection.headers.Authorization === "string" &&
      connection.headers.Authorization.length > 10,
  );

  // 4. Enroll the learner into a learning path
  // Need a learning_path_id; simulate one for test; in real scenario, this would be created or known
  const learningPathId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const enrollmentCreateBody = {
    learner_id: authenticatedLearner.id,
    learning_path_id: learningPathId,
    status: "active",
    business_status: null,
  } satisfies IEnterpriseLmsEnrollment.ICreate;

  const enrollment: IEnterpriseLmsEnrollment =
    await api.functional.enterpriseLms.corporateLearner.enrollments.createEnrollment(
      connection,
      {
        body: enrollmentCreateBody,
      },
    );
  typia.assert(enrollment);

  TestValidator.equals(
    "enrollment learner_id matches authenticated learner",
    enrollment.learner_id,
    authenticatedLearner.id,
  );

  TestValidator.equals(
    "enrollment learning_path_id matches",
    enrollment.learning_path_id,
    learningPathId,
  );

  TestValidator.equals(
    "enrollment status is active",
    enrollment.status,
    "active",
  );

  // 5. Create an assessment result record
  // The assessmentId parameter is passed to the function as a test parameter. We'll simulate it here.
  const assessmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Compose assessment result create body
  const assessmentResultCreateBody = {
    assessment_id: assessmentId,
    learner_id: authenticatedLearner.id,
    score: Math.floor(Math.random() * 101), // score between 0 and 100
    completed_at: new Date().toISOString(),
    status: "completed",
  } satisfies IEnterpriseLmsAssessmentResult.ICreate;

  const assessmentResult: IEnterpriseLmsAssessmentResult =
    await api.functional.enterpriseLms.corporateLearner.assessments.results.create(
      connection,
      {
        assessmentId: assessmentId,
        body: assessmentResultCreateBody,
      },
    );
  typia.assert(assessmentResult);

  TestValidator.equals(
    "assessment result assessment_id matches",
    assessmentResult.assessment_id,
    assessmentId,
  );

  TestValidator.equals(
    "assessment result learner_id matches enrolled learner",
    assessmentResult.learner_id,
    authenticatedLearner.id,
  );

  TestValidator.predicate(
    "assessment result score is between 0 and 100",
    assessmentResult.score >= 0 && assessmentResult.score <= 100,
  );

  TestValidator.equals(
    "assessment result status is completed",
    assessmentResult.status,
    "completed",
  );

  TestValidator.predicate(
    "assessment result completed_at is valid ISO string",
    typeof assessmentResult.completed_at === "string" &&
      !isNaN(Date.parse(assessmentResult.completed_at ?? "")),
  );
}
