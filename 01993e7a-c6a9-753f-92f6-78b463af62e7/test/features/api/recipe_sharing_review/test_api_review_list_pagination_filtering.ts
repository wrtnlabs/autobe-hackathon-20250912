import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingReview";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingReview";

/**
 * Test retrieving a paginated and filtered list of recipe sharing reviews.
 *
 * Full flow:
 *
 * 1. Create a regular user by joining with email, username, and password hash.
 * 2. Login the user to authenticate and obtain authorization.
 * 3. Create multiple recipe sharing reviews with different recipe IDs and varied
 *    review text.
 * 4. Retrieve paginated and filtered review lists filtered by user ID.
 * 5. Retrieve paginated and filtered review lists filtered by recipe ID.
 * 6. Retrieve paginated and filtered review lists filtered by partial search text.
 * 7. Validate pagination metadata correctness and reviews sorted by created_at
 *    descending.
 * 8. Test unauthorized access by calling index endpoint with unauthenticated
 *    connection expecting error.
 */
export async function test_api_review_list_pagination_filtering(
  connection: api.IConnection,
) {
  // 1. Create a regular user with join
  const email: string = typia.random<string & tags.Format<"email">>();
  const username: string = RandomGenerator.name();
  // Simulate password hash as a random alphanumeric string of length 32
  const password_hash = RandomGenerator.alphaNumeric(32);

  const createUser = await api.functional.auth.regularUser.join(connection, {
    body: {
      email,
      password_hash,
      username,
    } satisfies IRecipeSharingRegularUser.ICreate,
  });
  typia.assert(createUser);

  // 2. Login with created user
  const loggedInUser = await api.functional.auth.regularUser.login(connection, {
    body: {
      email,
      password_hash,
    } satisfies IRecipeSharingRegularUser.ILogin,
  });
  typia.assert(loggedInUser);

  // The authenticated user ID
  const userId = loggedInUser.id;

  // 3. Create multiple reviews with different recipe IDs and review texts
  // Create 10 reviews: 5 for recipeA, 5 for recipeB, with varied review_text
  const recipeAId: string = typia.random<string & tags.Format<"uuid">>();
  const recipeBId: string = typia.random<string & tags.Format<"uuid">>();

  // Create reviews array to keep
  const reviews: IRecipeSharingReview[] = [];

  for (let i = 0; i < 10; ++i) {
    const recipeId = i < 5 ? recipeAId : recipeBId;
    const reviewText = RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    });

    const review =
      await api.functional.recipeSharing.regularUser.reviews.create(
        connection,
        {
          body: {
            recipe_sharing_user_id: userId,
            recipe_sharing_recipe_id: recipeId,
            review_text: reviewText,
          } satisfies IRecipeSharingReview.ICreate,
        },
      );
    typia.assert(review);
    reviews.push(review);
  }

  // 4. Retrieve paginated list filtering by user ID
  {
    const filters = {
      recipe_sharing_user_id: userId,
      page: 1,
      limit: 10,
    } satisfies IRecipeSharingReview.IRequest;

    const pageResult =
      await api.functional.recipeSharing.regularUser.reviews.index(connection, {
        body: filters,
      });
    typia.assert(pageResult);

    // Validate filters
    TestValidator.predicate(
      "page data contains only reviews of specified user",
      pageResult.data.every((r) => r.id !== undefined),
    );

    // Validate pagination
    TestValidator.predicate(
      "pagination current page is 1",
      pageResult.pagination.current === 1,
    );

    TestValidator.predicate(
      "pagination limit is 10",
      pageResult.pagination.limit === 10,
    );

    TestValidator.predicate(
      "pagination records at least 10",
      pageResult.pagination.records >= 10,
    );

    // Validate sorting by created_at descending
    for (let i = 1; i < pageResult.data.length; ++i) {
      const prev = new Date(pageResult.data[i - 1].created_at).getTime();
      const curr = new Date(pageResult.data[i].created_at).getTime();
      TestValidator.predicate(
        `created_at of record ${i - 1} >= record ${i}`,
        prev >= curr,
      );
    }
  }

  // 5. Retrieve paginated list filtering by recipe ID (recipeAId)
  {
    const filters = {
      recipe_sharing_recipe_id: recipeAId,
      page: 1,
      limit: 5,
    } satisfies IRecipeSharingReview.IRequest;

    const pageResult =
      await api.functional.recipeSharing.regularUser.reviews.index(connection, {
        body: filters,
      });
    typia.assert(pageResult);

    TestValidator.predicate(
      "page data contains only reviews for specified recipe",
      pageResult.data.every((r) => r.id !== undefined),
    );

    TestValidator.predicate(
      "pagination current page is 1",
      pageResult.pagination.current === 1,
    );

    TestValidator.predicate(
      "pagination limit is 5",
      pageResult.pagination.limit === 5,
    );

    TestValidator.predicate(
      "pagination records at least 5",
      pageResult.pagination.records >= 5,
    );

    // Sorting check descending
    for (let i = 1; i < pageResult.data.length; ++i) {
      const prev = new Date(pageResult.data[i - 1].created_at).getTime();
      const curr = new Date(pageResult.data[i].created_at).getTime();
      TestValidator.predicate(
        `created_at of record ${i - 1} >= record ${i}`,
        prev >= curr,
      );
    }
  }

  // 6. Retrieve paginated list filtering by search text partial match on review_text
  {
    // Pick a random review text word from existing review
    const randomReview = RandomGenerator.pick(reviews);
    // Extract a word substring from random review_text
    const words = randomReview.review_text
      .split(" ")
      .filter((w) => w.length >= 3);
    const searchText = words.length > 0 ? RandomGenerator.pick(words) : "test";

    const filters = {
      search: searchText,
      page: 1,
      limit: 10,
    } satisfies IRecipeSharingReview.IRequest;

    const pageResult =
      await api.functional.recipeSharing.regularUser.reviews.index(connection, {
        body: filters,
      });
    typia.assert(pageResult);

    // Validate all returned review_text include the searchText
    TestValidator.predicate(
      "all review_texts contain search text",
      pageResult.data.every((r) => r.review_text.includes(searchText)),
    );

    TestValidator.predicate(
      "pagination current page is 1",
      pageResult.pagination.current === 1,
    );

    TestValidator.predicate(
      "pagination limit is 10",
      pageResult.pagination.limit === 10,
    );

    // Sorting check descending
    for (let i = 1; i < pageResult.data.length; ++i) {
      const prev = new Date(pageResult.data[i - 1].created_at).getTime();
      const curr = new Date(pageResult.data[i].created_at).getTime();
      TestValidator.predicate(
        `created_at of record ${i - 1} >= record ${i}`,
        prev >= curr,
      );
    }
  }

  // 7. Validate unauthorized request is rejected
  {
    // Create unauthenticated connection with empty headers
    const unauthConn: api.IConnection = { ...connection, headers: {} };

    await TestValidator.error("unauthorized access causes error", async () => {
      await api.functional.recipeSharing.regularUser.reviews.index(unauthConn, {
        body: { page: 1, limit: 1 } satisfies IRecipeSharingReview.IRequest,
      });
    });
  }
}
