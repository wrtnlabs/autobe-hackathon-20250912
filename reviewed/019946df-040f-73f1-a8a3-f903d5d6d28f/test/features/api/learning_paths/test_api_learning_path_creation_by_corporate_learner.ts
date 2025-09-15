import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsLearningPaths } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPaths";

/**
 * This E2E test validates the creation of a new learning path by an
 * authenticated corporate learner in the Enterprise LMS system. The test begins
 * with creating a corporate learner account using the
 * /auth/corporateLearner/join endpoint, providing necessary tenant_id, email,
 * password, first_name, and last_name to register the user. It then logs in as
 * that corporate learner using /auth/corporateLearner/login to establish an
 * authenticated session and obtain the authorization token and tenant context.
 *
 * Using the authenticated session, the test sends a POST request to
 * /enterpriseLms/corporateLearner/learningPaths to create a new learning path.
 * The learning path creation details include a unique code within the tenant, a
 * title, an optional description, the tenant_id derived from the authenticated
 * user, and an active status. The test validates that the returned learning
 * path entity contains the expected properties with matching values and that
 * created_at and updated_at timestamps are present.
 *
 * The test also checks for business logic correctness such as unique code per
 * tenant by attempting to create a duplicate code and expecting an error.
 * Unauthorized access attempts without login should also fail.
 *
 * This comprehensive test ensures multi-tenant data integrity, role-based
 * access enforcement, data validation, and proper lifecycle assignments for
 * learning paths created by corporate learners, providing robust coverage of
 * the learning path creation workflow in a multi-tenant corporate learning
 * environment.
 */
export async function test_api_learning_path_creation_by_corporate_learner(
  connection: api.IConnection,
) {
  // 1. Create a corporate learner account
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const joinBody = {
    tenant_id: tenantId,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: "P@ssw0rd1234",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const corporateLearner: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: joinBody,
    });
  typia.assert(corporateLearner);

  // 2. Login as the same corporate learner (simulate re-login)
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;

  const corporateLearnerLoggedIn: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: loginBody,
    });
  typia.assert(corporateLearnerLoggedIn);
  TestValidator.equals(
    "tenant ID matches on login",
    corporateLearnerLoggedIn.tenant_id,
    joinBody.tenant_id,
  );

  // 3. Create a new learning path
  const uniqueCode = `LP${RandomGenerator.alphaNumeric(6)}`;
  const createLearningPathBody = {
    tenant_id: corporateLearnerLoggedIn.tenant_id,
    code: uniqueCode,
    title: `Learning Path - ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
  } satisfies IEnterpriseLmsLearningPaths.ICreate;

  const createdLearningPath: IEnterpriseLmsLearningPaths =
    await api.functional.enterpriseLms.corporateLearner.learningPaths.create(
      connection,
      {
        body: createLearningPathBody,
      },
    );
  typia.assert(createdLearningPath);

  // Assertions for created learning path data
  TestValidator.equals(
    "learning path tenant ID matches",
    createdLearningPath.tenant_id,
    createLearningPathBody.tenant_id,
  );
  TestValidator.equals(
    "learning path code matches",
    createdLearningPath.code,
    createLearningPathBody.code,
  );
  TestValidator.equals(
    "learning path title matches",
    createdLearningPath.title,
    createLearningPathBody.title,
  );
  TestValidator.equals(
    "learning path description matches",
    createdLearningPath.description,
    createLearningPathBody.description,
  );
  TestValidator.equals(
    "learning path status matches",
    createdLearningPath.status,
    createLearningPathBody.status,
  );

  // Check timestamps presence
  TestValidator.predicate(
    "learning path created_at present",
    typeof createdLearningPath.created_at === "string",
  );
  TestValidator.predicate(
    "learning path updated_at present",
    typeof createdLearningPath.updated_at === "string",
  );

  // 4. Attempt to create a duplicate learning path code in same tenant, expect error
  await TestValidator.error(
    "duplicate learning path code should cause error",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.learningPaths.create(
        connection,
        {
          body: {
            tenant_id: createLearningPathBody.tenant_id,
            code: createLearningPathBody.code,
            title: `Duplicate - ${RandomGenerator.name(2)}`,
            description: null,
            status: "active",
          } satisfies IEnterpriseLmsLearningPaths.ICreate,
        },
      );
    },
  );

  // 5. Attempt unauthorized creation with empty headers (unauthenticated)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized learning path creation should fail",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.learningPaths.create(
        unauthenticatedConnection,
        {
          body: createLearningPathBody,
        },
      );
    },
  );
}
