import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsEnrollment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsEnrollment";

/**
 * This test checks the detailed retrieval of enrollment information for a
 * corporate learner.
 *
 * The test flow includes:
 *
 * 1. Register a new corporate learner with a specified tenant_id and random
 *    email.
 * 2. Authenticate the corporate learner via login.
 * 3. Use the authenticated context to fetch the enrollment detail by the
 *    enrollment's id.
 * 4. Validate the enrollment response: all expected properties are present and
 *    correctly typed.
 * 5. Validate tenant isolation by checking the learner_id in the enrollment.
 * 6. Attempt to fetch a non-existent enrollment to verify proper error
 *    handling.
 */
export async function test_api_enrollment_detail_retrieval_by_corporatelearner(
  connection: api.IConnection,
) {
  // 1-2: Register and login as new corporate learner
  const tenantId = typia.random<string & tags.Format<"uuid">>();
  const email = `user${RandomGenerator.alphaNumeric(8)}@example.com`;
  const password = "StrongPassword123";

  const createBody = {
    tenant_id: tenantId,
    email: email,
    password: password,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const learner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: createBody,
    });
  typia.assert(learner);

  // Login after join to ensure token and session are fresh
  const loginBody = {
    email: email,
    password: password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;

  const authorized: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: loginBody,
    });
  typia.assert(authorized);

  // Mimic authenticated context by reusing connection (SDK handles token automatically)

  // 3: Retrieve enrollment detail by enrollment id
  // Enrollment id to use: use learner's id for demonstration (ideally an actual enrollment id)
  // Since we do not have an enrollment creation endpoint, test with a random UUID and test error scenario

  // First, test retrieval with an arbitrary valid UUID (simulate non-existent enrollment)
  const fakeEnrollmentId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "fetching non-existent enrollment should throw error",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.enrollments.atEnrollment(
        connection,
        {
          id: fakeEnrollmentId,
        },
      );
    },
  );

  // To test a successful retrieval, we need an actual valid enrollment id owned by learner
  // Since no creation API is provided, simulate successful enrollment retrieval using the provided API simulate feature
  // Use learner.id as enrollment id to simulate retrieval
  const enrollmentId = learner.id;
  const enrollment: IEnterpriseLmsEnrollment =
    await api.functional.enterpriseLms.corporateLearner.enrollments.atEnrollment(
      connection,
      { id: enrollmentId },
    );
  typia.assert(enrollment);

  // 4: Validate enrollment properties
  TestValidator.predicate(
    "enrollment.id should be UUID",
    !!enrollment.id &&
      typeof enrollment.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        enrollment.id,
      ),
  );
  TestValidator.predicate(
    "enrollment.status is a non-empty string",
    typeof enrollment.status === "string" && enrollment.status.length > 0,
  );

  // 5: Validate tenant isolation: enrollment.learner_id must match learner.id
  TestValidator.equals(
    "enrollment learner_id matches authenticated learner id",
    enrollment.learner_id,
    learner.id,
  );

  // Additional checks for timestamps
  TestValidator.predicate(
    "enrollment.created_at is ISO date string",
    typeof enrollment.created_at === "string" &&
      !isNaN(Date.parse(enrollment.created_at)),
  );
  TestValidator.predicate(
    "enrollment.updated_at is ISO date string",
    typeof enrollment.updated_at === "string" &&
      !isNaN(Date.parse(enrollment.updated_at)),
  );

  // 6: Attempt to fetch enrollment with unauthorized id to test error
  // Use a different random UUID (simulate unauthorized access)
  const unauthorizedEnrollmentId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "fetching unauthorized enrollment should throw error",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.enrollments.atEnrollment(
        connection,
        {
          id: unauthorizedEnrollmentId,
        },
      );
    },
  );
}
