import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { INotificationWorkflowTriggerOperator } from "@ORGANIZATION/PROJECT-api/lib/structures/INotificationWorkflowTriggerOperator";

export async function test_api_trigger_operator_get_trigger_operator_details_success(
  connection: api.IConnection,
) {
  // Step 1: Create a trigger operator user to obtain valid user ID and authentication token
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies INotificationWorkflowTriggerOperator.ICreate;

  const authorizedUser: INotificationWorkflowTriggerOperator.IAuthorized =
    await api.functional.auth.triggerOperator.join.joinTriggerOperator(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(authorizedUser);

  // Step 2: Use the returned ID to fetch detailed trigger operator user information
  const userDetails: INotificationWorkflowTriggerOperator =
    await api.functional.notificationWorkflow.triggerOperator.triggerOperators.at(
      connection,
      {
        id: authorizedUser.id,
      },
    );
  typia.assert(userDetails);

  // Step 3: Validate that the fetched user details match the created user info
  TestValidator.equals(
    "fetched user ID matches created ID",
    userDetails.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "fetched user email matches created email",
    userDetails.email,
    authorizedUser.email,
  );
  TestValidator.equals(
    "password hash is exposed correctly",
    userDetails.password_hash,
    authorizedUser.password_hash,
  );

  // Validate datetime fields presence and types indirectly via typia.assert
  TestValidator.predicate(
    "created_at is a valid ISO date-time string",
    typeof userDetails.created_at === "string" &&
      !!userDetails.created_at.match(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      ),
  );
  TestValidator.predicate(
    "updated_at is a valid ISO date-time string",
    typeof userDetails.updated_at === "string" &&
      !!userDetails.updated_at.match(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      ),
  );

  // deleted_at can be null or string in date-time format
  if (userDetails.deleted_at !== null && userDetails.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is a valid ISO date-time string",
      typeof userDetails.deleted_at === "string" &&
        !!userDetails.deleted_at.match(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
        ),
    );
  }
}
