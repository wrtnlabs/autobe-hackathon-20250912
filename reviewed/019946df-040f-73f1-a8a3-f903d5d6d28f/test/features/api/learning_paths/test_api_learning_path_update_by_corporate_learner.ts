import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";
import type { IEnterpriseLmsLearningPaths } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsLearningPaths";

/**
 * E2E Test to verify updating a learning path by a corporate learner.
 *
 * This test function performs the following steps:
 *
 * 1. Registers a new corporate learner (join) for a tenant.
 * 2. Logs in as that corporate learner.
 * 3. Creates a learning path associated with the tenant.
 * 4. Updates the learning path with new valid data.
 * 5. Verifies the updated learning path data to confirm updates.
 * 6. Attempts unauthorized update by a different corporate learner to validate
 *    role-based access control.
 * 7. Tests error on updating a non-existent learning path ID.
 * 8. Tests error on updating with invalid input.
 *
 * The test ensures proper tenant data isolation, role authorization, and
 * correct data management.
 */
export async function test_api_learning_path_update_by_corporate_learner(
  connection: api.IConnection,
) {
  // 1. Register a new corporate learner user (join)
  const joinBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `user_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "Str0ngP@ssword!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const joinedUser: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: joinBody,
    });
  typia.assert(joinedUser);

  // 2. Login as the corporate learner to set authentication context
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;

  const loggedInUser: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // Confirm tenant_id consistency
  TestValidator.equals(
    "tenant_id consistency",
    loggedInUser.tenant_id,
    joinBody.tenant_id,
  );

  // 3. Create a learning path for this tenant
  const createLearningPathBody = {
    tenant_id: joinBody.tenant_id,
    code: `LP-${RandomGenerator.alphaNumeric(5)}`,
    title: "Initial Learning Path Title",
    description: "Initial description for learning path.",
    status: "active",
  } satisfies IEnterpriseLmsLearningPaths.ICreate;

  const createdLearningPath: IEnterpriseLmsLearningPaths =
    await api.functional.enterpriseLms.corporateLearner.learningPaths.create(
      connection,
      { body: createLearningPathBody },
    );
  typia.assert(createdLearningPath);

  TestValidator.equals(
    "created learning path tenant_id",
    createdLearningPath.tenant_id,
    loggedInUser.tenant_id,
  );
  TestValidator.equals(
    "created learning path code",
    createdLearningPath.code,
    createLearningPathBody.code,
  );
  TestValidator.equals(
    "created learning path title",
    createdLearningPath.title,
    createLearningPathBody.title,
  );
  TestValidator.equals(
    "created learning path status",
    createdLearningPath.status,
    createLearningPathBody.status,
  );

  // 4. Update the learning path with new data
  const updateBody = {
    code: `LP-${RandomGenerator.alphaNumeric(5)}`,
    title: "Updated Learning Path Title",
    description: "Updated detailed description for the learning path.",
    status: "inactive",
    deleted_at: null,
  } satisfies IEnterpriseLmsLearningPaths.IUpdate;

  const updatedLearningPath: IEnterpriseLmsLearningPaths =
    await api.functional.enterpriseLms.corporateLearner.learningPaths.update(
      connection,
      {
        learningPathId: createdLearningPath.id,
        body: updateBody,
      },
    );
  typia.assert(updatedLearningPath);

  TestValidator.equals(
    "updated learning path tenant_id",
    updatedLearningPath.tenant_id,
    loggedInUser.tenant_id,
  );
  TestValidator.equals(
    "updated learning path id",
    updatedLearningPath.id,
    createdLearningPath.id,
  );
  TestValidator.equals(
    "updated learning path code",
    updatedLearningPath.code,
    updateBody.code ?? createdLearningPath.code,
  );
  TestValidator.equals(
    "updated learning path title",
    updatedLearningPath.title,
    updateBody.title ?? createdLearningPath.title,
  );
  TestValidator.equals(
    "updated learning path description",
    updatedLearningPath.description,
    updateBody.description ?? createdLearningPath.description,
  );
  TestValidator.equals(
    "updated learning path status",
    updatedLearningPath.status,
    updateBody.status ?? createdLearningPath.status,
  );

  // 5. Attempt update with unauthorized user (different tenant) and expect failure

  // Register another user with different tenant
  const joinBodyOtherTenant = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `user_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "Str0ngP@ssword!",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const joinedUserOther: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: joinBodyOtherTenant,
    });
  typia.assert(joinedUserOther);

  const loginBodyOther = {
    email: joinBodyOtherTenant.email,
    password: joinBodyOtherTenant.password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;

  await api.functional.auth.corporateLearner.login(connection, {
    body: loginBodyOther,
  });

  // Now logged in as other user, try to update original learning path
  await TestValidator.error(
    "unauthorized user cannot update learning path",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.learningPaths.update(
        connection,
        {
          learningPathId: createdLearningPath.id,
          body: {
            title: "Unauthorized Update Attempt",
          } satisfies IEnterpriseLmsLearningPaths.IUpdate,
        },
      );
    },
  );

  // 6. Test error on updating non-existent learning path ID
  await TestValidator.error(
    "cannot update non-existent learning path",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.learningPaths.update(
        connection,
        {
          learningPathId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            title: "Non-existent ID Update",
          } satisfies IEnterpriseLmsLearningPaths.IUpdate,
        },
      );
    },
  );

  // 7. Test error on invalid update input (empty update body)
  await TestValidator.error("cannot update with empty input", async () => {
    await api.functional.enterpriseLms.corporateLearner.learningPaths.update(
      connection,
      {
        learningPathId: createdLearningPath.id,
        body: {},
      },
    );
  });
}
