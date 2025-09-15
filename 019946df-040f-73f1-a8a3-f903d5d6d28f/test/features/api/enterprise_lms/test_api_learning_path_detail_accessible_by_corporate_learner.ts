import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsLearningPaths } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPaths";

/**
 * This test verifies that a corporate learner can retrieve the detailed
 * information of a newly created learning path that belongs to their
 * tenant.
 *
 * 1. Create and join a corporate learner user with random but valid tenant_id,
 *    email, first_name and last_name.
 * 2. Log in using the same email and password to establish authenticated
 *    session.
 * 3. Create a new learning path for the tenant with unique code, title,
 *    description and active status.
 * 4. Query the learning path details by its ID.
 * 5. Assert that the returned learning path's all fields match the created
 *    data.
 * 6. Confirm the tenant_id in returned data matches the logged-in user's
 *    tenant_id to verify multi-tenant data isolation.
 * 7. Validate all API response types with typia.assert.
 */
export async function test_api_learning_path_detail_accessible_by_corporate_learner(
  connection: api.IConnection,
) {
  // 1. Create and join a corporate learner
  const tenant_id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const email: string = `user_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const password = "strongPassword123";

  const joinBody = {
    tenant_id,
    email,
    password,
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const joinedUser: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedUser);

  // 2. Login with the created user's credentials
  const loginBody = {
    email,
    password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;
  const loggedInUser: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // 3. Create a new learning path for the tenant
  const learningPathBody = {
    tenant_id: loggedInUser.tenant_id,
    code: `LP_${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "active",
  } satisfies IEnterpriseLmsLearningPaths.ICreate;

  const createdLearningPath: IEnterpriseLmsLearningPaths =
    await api.functional.enterpriseLms.corporateLearner.learningPaths.create(
      connection,
      { body: learningPathBody },
    );
  typia.assert(createdLearningPath);

  // 4. Retrieve the learning path details
  const fetchedLearningPath: IEnterpriseLmsLearningPaths =
    await api.functional.enterpriseLms.corporateLearner.learningPaths.at(
      connection,
      { learningPathId: createdLearningPath.id },
    );
  typia.assert(fetchedLearningPath);

  // 5. Assert that the returned details match creation input
  TestValidator.equals(
    "learning path ID",
    fetchedLearningPath.id,
    createdLearningPath.id,
  );
  TestValidator.equals(
    "tenant ID",
    fetchedLearningPath.tenant_id,
    loggedInUser.tenant_id,
  );
  TestValidator.equals("code", fetchedLearningPath.code, learningPathBody.code);
  TestValidator.equals(
    "title",
    fetchedLearningPath.title,
    learningPathBody.title,
  );
  TestValidator.equals(
    "description",
    fetchedLearningPath.description,
    learningPathBody.description,
  );
  TestValidator.equals(
    "status",
    fetchedLearningPath.status,
    learningPathBody.status,
  );

  TestValidator.predicate(
    "created_at is non-empty ISO string",
    typeof fetchedLearningPath.created_at === "string" &&
      fetchedLearningPath.created_at.length > 10,
  );
  TestValidator.predicate(
    "updated_at is non-empty ISO string",
    typeof fetchedLearningPath.updated_at === "string" &&
      fetchedLearningPath.updated_at.length > 10,
  );
}
