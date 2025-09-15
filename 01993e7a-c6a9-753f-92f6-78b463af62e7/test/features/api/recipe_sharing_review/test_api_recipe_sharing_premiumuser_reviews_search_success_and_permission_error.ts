import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingReview";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";

export async function test_api_recipe_sharing_premiumuser_reviews_search_success_and_permission_error(
  connection: api.IConnection,
) {
  // 1-3. Prepare and authenticate a premium user via join and login
  const joinBody = {
    email: `testuser+${Date.now()}@example.com`,
    password_hash: "hashed_password_123",
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const user = await api.functional.auth.premiumUser.join(connection, {
    body: joinBody,
  });
  typia.assert(user);

  const loginBody = {
    email: joinBody.email,
    password_hash: joinBody.password_hash,
  } satisfies IRecipeSharingPremiumUser.ILogin;

  const loginUser = await api.functional.auth.premiumUser.login(connection, {
    body: loginBody,
  });
  typia.assert(loginUser);

  // 4. Success scenario: Authenticated premium user search
  const filterStatuses = ["approved", "rejected"] as const;

  for (const status of filterStatuses) {
    const requestBody = {
      status,
      limit: 5,
      page: 1,
      search: RandomGenerator.substring(
        "delicious chocolate cake with nuts and berries",
      ),
    } satisfies IRecipeSharingReview.IRequest;

    const page = await api.functional.recipeSharing.premiumUser.reviews.index(
      connection,
      { body: requestBody },
    );
    typia.assert(page);

    TestValidator.predicate(
      `status filter '${status}' yields only matching reviews`,
      page.data.every((review) =>
        review.review_text.includes(requestBody.search ?? ""),
      ),
    );

    TestValidator.predicate(
      `pagination limit is honored for status '${status}'`,
      page.data.length <= requestBody.limit!,
    );

    TestValidator.predicate(
      `pagination current page is correct for status '${status}'`,
      page.pagination.current === requestBody.page,
    );
  }

  // 5. Permission error: unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "Fetching reviews without auth should error",
    async () => {
      await api.functional.recipeSharing.premiumUser.reviews.index(unauthConn, {
        body: { limit: 5, page: 1 } satisfies IRecipeSharingReview.IRequest,
      });
    },
  );
}
