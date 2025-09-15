import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITaskManagementPm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPm";
import type { ITaskManagementQa } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementQa";

/**
 * This test validates the process of updating a Quality Assurance (QA) user by
 * a Project Manager (PM) user.
 *
 * It covers the entire flow from PM user creation, PM login, to updating a QA
 * user identified by ID. Tests the successful update case and failure case due
 * to invalid QA user ID.
 *
 * This ensures the API enforces proper authentication, correct data handling,
 * and error responses for invalid input.
 */
export async function test_api_qa_update_by_pm_user(
  connection: api.IConnection,
) {
  // Step 1: PM user creation
  const pmCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "StrongPass123!",
    name: RandomGenerator.name(2),
  } satisfies ITaskManagementPm.ICreate;

  const pmAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.join(connection, { body: pmCreateBody });
  typia.assert(pmAuthorized);

  // Step 2: PM user login
  const pmLoginBody = {
    email: pmCreateBody.email,
    password: pmCreateBody.password,
  } satisfies ITaskManagementPm.ILogin;

  const pmLoginAuthorized: ITaskManagementPm.IAuthorized =
    await api.functional.auth.pm.login(connection, { body: pmLoginBody });
  typia.assert(pmLoginAuthorized);

  // Step 3: Existing QA user ID (simulate random UUID)
  const existingQaId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Prepare update payload
  const updatePayload = {
    updated_at: new Date().toISOString(),
  } satisfies ITaskManagementQa.IUpdate;

  // Step 5: Update QA user
  const updatedQaUser: ITaskManagementQa =
    await api.functional.taskManagement.pm.taskManagement.qas.update(
      connection,
      {
        id: existingQaId,
        body: updatePayload,
      },
    );
  typia.assert(updatedQaUser);

  // Validate the updated user ID matches
  TestValidator.equals(
    "Updated QA user ID matches",
    updatedQaUser.id,
    existingQaId,
  );

  // Validate updated_at is a valid ISO date string
  if (
    updatedQaUser.updated_at !== undefined &&
    updatedQaUser.updated_at !== null
  ) {
    const updatedAtDate = new Date(updatedQaUser.updated_at);
    TestValidator.predicate(
      "QA user updated_at is valid ISO date",
      !isNaN(updatedAtDate.getTime()),
    );
  }

  // Step 6: Test error case: update with invalid UUID
  await TestValidator.error(
    "Update with invalid QA user ID should fail",
    async () => {
      await api.functional.taskManagement.pm.taskManagement.qas.update(
        connection,
        {
          id: "invalid-uuid-string",
          body: updatePayload,
        },
      );
    },
  );
}
