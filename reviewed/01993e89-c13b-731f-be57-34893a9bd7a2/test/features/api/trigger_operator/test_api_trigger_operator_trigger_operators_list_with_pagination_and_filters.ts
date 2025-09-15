import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";

/**
 * This test creates a new trigger operator user via the join API, establishing
 * authentication context for 'triggerOperator' role.
 *
 * Due to the lack of exposed SDK method for PATCH
 * /notificationWorkflow/triggerOperator/triggerOperators, the test cannot
 * implement listing, pagination, and filtering fully.
 *
 * This test validates the full join operation including data creation, response
 * type assertions, and authentication token receipt.
 */
export async function test_api_trigger_operator_trigger_operators_list_with_pagination_and_filters(
  connection: api.IConnection,
) {
  // Create a new trigger operator user to authenticate
  const createBody = {
    email: `${RandomGenerator.name(1)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowTriggerOperator.ICreate;

  const createdUser: INotificationWorkflowTriggerOperator.IAuthorized =
    await api.functional.auth.triggerOperator.join.joinTriggerOperator(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdUser);
}
