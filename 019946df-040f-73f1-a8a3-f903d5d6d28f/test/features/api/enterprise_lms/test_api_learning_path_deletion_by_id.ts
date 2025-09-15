import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsLearningPaths } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPaths";

/**
 * End-to-end test verifying the workflow of a corporate learner creating and
 * then deleting a learning path within a tenant in the Enterprise LMS.
 *
 * This test ensures correct tenant association, secure authentication, valid
 * creation of learning paths, successful deletion by ID, and proper error
 * handling when attempting to delete non-existent or unauthorized learning
 * paths.
 *
 * Steps:
 *
 * 1. Register a new corporate learner user with proper tenant context.
 * 2. Login to authenticate that user.
 * 3. Create a new learning path with code, title, description, and status.
 * 4. Delete the created learning path by its unique id.
 * 5. Attempt to delete a non-existent learning path and expect an error.
 * 6. Attempt to delete a learning path from a different tenant and expect an
 *    error.
 */
export async function test_api_learning_path_deletion_by_id(
  connection: api.IConnection,
) {
  // 1. Register new corporate learner with unique tenant and profile
  const tenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const newUser = {
    tenant_id: tenantId,
    email: `test_${RandomGenerator.alphaNumeric(5).toLowerCase()}@example.com`,
    password: "StrongPassword123!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const createdUser: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: newUser,
    });
  typia.assert(createdUser);

  // 2. Login as the registered corporate learner
  const loginBody = {
    email: newUser.email,
    password: newUser.password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;

  const loggedInUser: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // 3. Create a new learning path linked to tenant
  const createBody = {
    tenant_id: tenantId,
    code: `LP-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
  } satisfies IEnterpriseLmsLearningPaths.ICreate;

  const createdLearningPath: IEnterpriseLmsLearningPaths =
    await api.functional.enterpriseLms.corporateLearner.learningPaths.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdLearningPath);

  TestValidator.equals(
    "learning path tenant_id matches",
    createdLearningPath.tenant_id,
    tenantId,
  );

  TestValidator.predicate(
    "learning path id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createdLearningPath.id,
    ),
  );

  // 4. Delete the created learning path
  await api.functional.enterpriseLms.corporateLearner.learningPaths.erase(
    connection,
    {
      learningPathId: createdLearningPath.id,
    },
  );

  // 5. Attempt to delete a non-existent learning path (random UUID) expecting error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent learning path throws error",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.learningPaths.erase(
        connection,
        { learningPathId: nonExistentId },
      );
    },
  );

  // 6. Create another learning path under a different tenant
  const otherTenantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const otherUserNewUser = {
    tenant_id: otherTenantId,
    email: `other_${RandomGenerator.alphaNumeric(5).toLowerCase()}@example.com`,
    password: "AnotherStrongPass456$",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const otherUser: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: otherUserNewUser,
    });
  typia.assert(otherUser);

  await api.functional.auth.corporateLearner.login(connection, {
    body: {
      email: otherUserNewUser.email,
      password: otherUserNewUser.password,
    } satisfies IEnterpriseLmsCorporateLearner.ILogin,
  });

  const otherLPCreateBody = {
    tenant_id: otherTenantId,
    code: `LP-${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
  } satisfies IEnterpriseLmsLearningPaths.ICreate;

  const otherLearningPath: IEnterpriseLmsLearningPaths =
    await api.functional.enterpriseLms.corporateLearner.learningPaths.create(
      connection,
      {
        body: otherLPCreateBody,
      },
    );
  typia.assert(otherLearningPath);

  // Switch back to original user to test cross-tenant deletion error
  await api.functional.auth.corporateLearner.login(connection, {
    body: loginBody,
  });

  // 7. Attempt to delete other tenant's learning path expecting error
  await TestValidator.error(
    "deletion of learning path from another tenant throws error",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.learningPaths.erase(
        connection,
        {
          learningPathId: otherLearningPath.id,
        },
      );
    },
  );
}
