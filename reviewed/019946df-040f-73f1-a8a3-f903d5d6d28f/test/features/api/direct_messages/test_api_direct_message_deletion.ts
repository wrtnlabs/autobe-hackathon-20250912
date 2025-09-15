import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";

/**
 * This test validates the deletion flow of a direct message within the
 * enterprise LMS system.
 *
 * It performs the complete user lifecycle starting from registration and
 * login of a corporate learner, simulates the creation of a direct message
 * by generating a UUID (due to lack of creation API), then deletes the
 * direct message using the delete API endpoint.
 *
 * It also verifies that attempting to delete a non-existent or already
 * deleted message results in an error, ensuring proper access control and
 * error handling.
 *
 * Steps:
 *
 * 1. Register a corporate learner user with all mandatory fields.
 * 2. Login the user to get authorization token.
 * 3. Simulate direct message creation by generating a UUID representing the
 *    message ID.
 * 4. Delete the direct message by its ID.
 * 5. Verify that deleting the same message again results in an error.
 * 6. Verify that deleting a random invalid direct message ID also results in
 *    an error.
 */
export async function test_api_direct_message_deletion(
  connection: api.IConnection,
) {
  // Step 1: Register a corporate learner
  const tenant_id = typia.random<string & tags.Format<"uuid">>();
  const email = `user_${RandomGenerator.alphaNumeric(6)}@company.com`;
  const password = "Password123!";
  const first_name = RandomGenerator.name(1);
  const last_name = RandomGenerator.name(1);

  const joinBody = {
    tenant_id: tenant_id,
    email: email,
    password: password,
    first_name: first_name,
    last_name: last_name,
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const createdUser = await api.functional.auth.corporateLearner.join(
    connection,
    { body: joinBody },
  );
  typia.assert(createdUser);

  // Step 2: Login with created user
  const loginBody = {
    email: email,
    password: password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;

  const authorizedUser = await api.functional.auth.corporateLearner.login(
    connection,
    { body: loginBody },
  );
  typia.assert(authorizedUser);

  // Step 3: Simulate creation of direct message by generating UUID
  // (No actual creation API provided)
  const directMessageId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Delete the direct message by ID
  await api.functional.enterpriseLms.corporateLearner.directMessages.eraseDirectMessage(
    connection,
    { directMessageId: directMessageId },
  );

  // Step 5: Attempt to delete the same direct message again - should error
  await TestValidator.error(
    "deleting an already deleted direct message should fail",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.directMessages.eraseDirectMessage(
        connection,
        { directMessageId: directMessageId },
      );
    },
  );

  // Step 6: Attempt to delete a non-existent direct message ID - should error
  const invalidDirectMessageId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "deleting non-existent direct message should fail",
    async () => {
      await api.functional.enterpriseLms.corporateLearner.directMessages.eraseDirectMessage(
        connection,
        { directMessageId: invalidDirectMessageId },
      );
    },
  );
}
