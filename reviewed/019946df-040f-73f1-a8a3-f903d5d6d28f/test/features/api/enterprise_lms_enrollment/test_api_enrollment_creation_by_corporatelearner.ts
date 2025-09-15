import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsEnrollment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollment";

/**
 * This test function registers a new corporate learner user, logs in to
 * authenticate and obtain JWT tokens, and attempts to create learning path
 * enrollments using various input and authentication validity conditions.
 *
 * The steps include:
 *
 * 1. Signing up the corporate learner with valid tenant and email info.
 * 2. Logging in to get auth tokens.
 * 3. Creating an enrollment with the authenticated user's ID and a valid simulated
 *    learning path ID.
 * 4. Validating the creation response for correctness.
 * 5. Testing failure cases such as wrong learner ID, wrong learning path ID, and
 *    invalid authentication.
 *
 * This comprehensive test ensures enrollment creation correctness, data
 * integrity, and security authorization enforcement.
 */
export async function test_api_enrollment_creation_by_corporatelearner(
  connection: api.IConnection,
) {
  // 1. Register corporate learner user
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `user${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = RandomGenerator.alphaNumeric(12);
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);

  const joinBody = {
    tenant_id: tenantId,
    email: email,
    password: password,
    first_name: firstName,
    last_name: lastName,
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const authorizedUser = await api.functional.auth.corporateLearner.join(
    connection,
    { body: joinBody },
  );
  typia.assert(authorizedUser);

  // 2. Login as the corporate learner
  const loginBody = {
    email: email,
    password: password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;

  const loginResult = await api.functional.auth.corporateLearner.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loginResult);

  // 3. Successful enrollment creation
  const validEnrollmentBody = {
    learner_id: authorizedUser.id,
    learning_path_id: typia.random<string & tags.Format<"uuid">>(),
    status: "active",
  } satisfies IEnterpriseLmsEnrollment.ICreate;

  const createdEnrollment =
    await api.functional.enterpriseLms.corporateLearner.enrollments.createEnrollment(
      connection,
      { body: validEnrollmentBody },
    );
  typia.assert(createdEnrollment);

  TestValidator.equals(
    "Enrollment learner_id matches authorized user",
    createdEnrollment.learner_id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "Enrollment status is 'active'",
    createdEnrollment.status,
    "active",
  );

  // 4. Failure: invalid learner_id
  const invalidLearnerId = typia.random<string & tags.Format<"uuid">>();
  if (invalidLearnerId !== authorizedUser.id) {
    const invalidBody1 = {
      learner_id: invalidLearnerId,
      learning_path_id: validEnrollmentBody.learning_path_id,
      status: "active",
    } satisfies IEnterpriseLmsEnrollment.ICreate;

    await TestValidator.error(
      "Enrollment creation fails with invalid learner_id",
      async () => {
        await api.functional.enterpriseLms.corporateLearner.enrollments.createEnrollment(
          connection,
          { body: invalidBody1 },
        );
      },
    );
  }

  // 5. Failure: invalid learning_path_id
  const invalidLearningPathId = typia.random<string & tags.Format<"uuid">>();
  if (invalidLearningPathId !== validEnrollmentBody.learning_path_id) {
    const invalidBody2 = {
      learner_id: authorizedUser.id,
      learning_path_id: invalidLearningPathId,
      status: "active",
    } satisfies IEnterpriseLmsEnrollment.ICreate;

    await TestValidator.error(
      "Enrollment creation fails with invalid learning_path_id",
      async () => {
        await api.functional.enterpriseLms.corporateLearner.enrollments.createEnrollment(
          connection,
          { body: invalidBody2 },
        );
      },
    );
  }

  // 6. Failure: unauthorized enrollment creation (no valid auth token)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  const unauthorizedBody = {
    learner_id: authorizedUser.id,
    learning_path_id: validEnrollmentBody.learning_path_id,
    status: "active",
  } satisfies IEnterpriseLmsEnrollment.ICreate;

  await TestValidator.error(
    "Enrollment creation fails without authentication",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.enrollments.createEnrollment(
        unauthConnection,
        { body: unauthorizedBody },
      );
    },
  );
}
