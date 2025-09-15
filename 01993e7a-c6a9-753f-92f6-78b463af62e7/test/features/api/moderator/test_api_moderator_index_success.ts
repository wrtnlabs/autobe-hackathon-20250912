import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingModerator";
import type { IRecipeSharingModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingModerator";

export async function test_api_moderator_index_success(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator user via the join operation to set up authentication context
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(20),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingModerator.ICreate;
  const authorizedModerator: IRecipeSharingModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, { body: createBody });
  typia.assert(authorizedModerator);

  // Step 2: Prepare filter and pagination request body
  // Use existing moderator's email and username for filtering to ensure match
  const requestBody = {
    email: authorizedModerator.email,
    username: authorizedModerator.username,
    page: 1,
    limit: 10,
    sortBy: "email",
    sortDirection: "asc",
  } satisfies IRecipeSharingModerator.IRequest;

  // Step 3: Call the moderator list index API
  const result: IPageIRecipeSharingModerator.ISummary =
    await api.functional.recipeSharing.moderator.moderators.index(connection, {
      body: requestBody,
    });
  typia.assert(result);

  // Step 4: Validate pagination info matches request and sensible values
  TestValidator.predicate(
    "pagination current page should match request",
    result.pagination.current === requestBody.page,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    result.pagination.limit === requestBody.limit,
  );
  TestValidator.predicate(
    "pagination pages should be positive",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    result.pagination.records >= 0,
  );

  // Step 5: Validate that returned data only contains moderators with matching email and username filters
  // Since filters are by exact email and username, all results should have those exact values
  for (const mod of result.data) {
    typia.assert(mod);
    TestValidator.equals(
      "moderator email matches filter",
      mod.email,
      authorizedModerator.email,
    );
    TestValidator.equals(
      "moderator username matches filter",
      mod.username,
      authorizedModerator.username,
    );
    TestValidator.predicate(
      "moderator id is uuid format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        mod.id,
      ),
    );
  }
}
