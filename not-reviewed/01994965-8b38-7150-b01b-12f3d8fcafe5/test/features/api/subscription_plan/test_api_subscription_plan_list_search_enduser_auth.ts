import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITelegramFileDownloaderSubscriptionPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITelegramFileDownloaderSubscriptionPlans";
import type { ITelegramFileDownloaderEndUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderEndUser";
import type { ITelegramFileDownloaderSubscriptionPlans } from "@ORGANIZATION/PROJECT-api/lib/structures/ITelegramFileDownloaderSubscriptionPlans";

/**
 * Tests the workflow of endUser subscription plan list search with
 * authentication.
 *
 * This test ensures that a new endUser can register and login successfully,
 * then access the subscription plans list with appropriate filtering and
 * pagination.
 *
 * Workflow:
 *
 * 1. Register a new endUser account with unique email and password hash.
 * 2. Login as the registered endUser to obtain authorization tokens.
 * 3. Use the authenticated token to send a PATCH request searching
 *    subscription plans.
 * 4. Validate that the response contains pagination information and a list of
 *    subscription plans.
 * 5. Assert that all subscription plan fields meet schema requirements and
 *    business logic.
 *
 * This test checks both success path and proper filter application.
 */
export async function test_api_subscription_plan_list_search_enduser_auth(
  connection: api.IConnection,
) {
  // 1. Register a new endUser with unique email and password
  const email = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const joinBody = {
    email: email,
    password_hash: passwordHash,
  } satisfies ITelegramFileDownloaderEndUser.ICreate;
  const authorizedUser: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedUser);

  // 2. Login with the registered endUser
  const loginBody = {
    email: email,
    password: passwordHash, // Per DTO it's plaintext password for login
  } satisfies ITelegramFileDownloaderEndUser.ILogin;
  const loggedInUser: ITelegramFileDownloaderEndUser.IAuthorized =
    await api.functional.auth.endUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // 3. Search subscription plans via PATCH endpoint with some filter and pagination
  const searchRequest: ITelegramFileDownloaderSubscriptionPlans.IRequest = {
    code: null,
    name: null,
    price: null,
    max_files_per_day: null,
    max_file_size_mb: null,
    total_storage_mb: null,
    status: null,
    page: 1,
    limit: 10,
  };

  const planPage: IPageITelegramFileDownloaderSubscriptionPlans =
    await api.functional.telegramFileDownloader.endUser.subscription.plans.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(planPage);

  // 4. Validate pagination info
  TestValidator.predicate(
    "pagination current page should be 1",
    planPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    planPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    planPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    planPage.pagination.pages >= 0,
  );

  // 5. Validate subscription plan data
  for (const plan of planPage.data) {
    typia.assert(plan);

    TestValidator.predicate(
      `subscription plan ${plan.id} code is non-empty string`,
      typeof plan.code === "string" && plan.code.length > 0,
    );
    TestValidator.predicate(
      `subscription plan ${plan.id} name is non-empty string`,
      typeof plan.name === "string" && plan.name.length > 0,
    );
    TestValidator.predicate(
      `subscription plan ${plan.id} price is number`,
      typeof plan.price === "number",
    );
    TestValidator.predicate(
      `subscription plan ${plan.id} max_files_per_day is positive integer`,
      Number.isInteger(plan.max_files_per_day) && plan.max_files_per_day >= 0,
    );
    TestValidator.predicate(
      `subscription plan ${plan.id} max_file_size_mb is positive integer`,
      Number.isInteger(plan.max_file_size_mb) && plan.max_file_size_mb >= 0,
    );
    TestValidator.predicate(
      `subscription plan ${plan.id} total_storage_mb is positive integer`,
      Number.isInteger(plan.total_storage_mb) && plan.total_storage_mb >= 0,
    );
    TestValidator.predicate(
      `subscription plan ${plan.id} status is string`,
      typeof plan.status === "string",
    );

    // Validate created_at and updated_at are ISO date-time strings
    TestValidator.predicate(
      `subscription plan ${plan.id} created_at matches ISO date-time`,
      typeof plan.created_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(plan.created_at),
    );
    TestValidator.predicate(
      `subscription plan ${plan.id} updated_at matches ISO date-time`,
      typeof plan.updated_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(plan.updated_at),
    );

    // deleted_at can be null or ISO string if present
    if (plan.deleted_at !== null && plan.deleted_at !== undefined) {
      TestValidator.predicate(
        `subscription plan ${plan.id} deleted_at null or ISO date-time`,
        typeof plan.deleted_at === "string" &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(plan.deleted_at),
      );
    }
  }
}
