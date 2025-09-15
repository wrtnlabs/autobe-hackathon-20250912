import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingPersonalizedFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingPersonalizedFeed";
import type { IRecipeSharingPersonalizedFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPersonalizedFeed";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Validate personalized feed retrieval success for premium user.
 *
 * Workflow steps:
 *
 * 1. Create premium user and authenticate
 * 2. Create regular user and authenticate
 * 3. Create a recipe under regular user
 * 4. Create a personalized feed entry linking premium user, recipe, originator
 * 5. Switch back to premium user session
 * 6. Request personalized feed list with pagination & filtering
 * 7. Validate response correctness
 */
export async function test_api_personalized_feed_success_retrieval(
  connection: api.IConnection,
) {
  // 1. Create premium user and authenticate
  const premiumUserBody = {
    email: `premium${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: `PremiumUser${RandomGenerator.alphabets(5)}`,
  } satisfies IRecipeSharingPremiumUser.ICreate;
  const premiumUser: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.join(connection, {
      body: premiumUserBody,
    });
  typia.assert(premiumUser);

  // 2. Create regular user and authenticate
  const regularUserBody = {
    email: `regular${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: `RegularUser${RandomGenerator.alphabets(5)}`,
  } satisfies IRecipeSharingRegularUser.ICreate;
  const regularUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: regularUserBody,
    });
  typia.assert(regularUser);

  // Switch regular user login
  const regularUserLoginBody = {
    email: regularUserBody.email,
    password_hash: regularUserBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;
  const regularUserAuth: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: regularUserLoginBody,
    });
  typia.assert(regularUserAuth);

  // 3. Create recipe under regular user
  const recipeBody = {
    created_by_id: regularUser.id,
    title: `Recipe ${RandomGenerator.paragraph({ sentences: 3 })}`,
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "published",
  } satisfies IRecipeSharingRecipes.ICreate;
  const recipe: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: recipeBody,
    });
  typia.assert(recipe);

  // 4. Create personalized feed entry linking premium user, recipe, originator
  const personalizedFeedBody = {
    user_id: premiumUser.id,
    recipe_id: recipe.id,
    originator_user_id: regularUser.id,
  } satisfies IRecipeSharingPersonalizedFeed.ICreate;
  const personalizedFeed: IRecipeSharingPersonalizedFeed =
    await api.functional.recipeSharing.regularUser.personalizedFeeds.create(
      connection,
      { body: personalizedFeedBody },
    );
  typia.assert(personalizedFeed);

  // Switch premium user login
  const premiumUserLoginBody = {
    email: premiumUserBody.email,
    password_hash: premiumUserBody.password_hash,
  } satisfies IRecipeSharingPremiumUser.ILogin;
  const premiumUserAuth: IRecipeSharingPremiumUser.IAuthorized =
    await api.functional.auth.premiumUser.login(connection, {
      body: premiumUserLoginBody,
    });
  typia.assert(premiumUserAuth);

  // 5. Request personalized feed list with pagination & filtering
  const requestBody = {
    user_id: premiumUser.id,
    page: 0,
    limit: 10,
    sort_by: "created_at",
    order: "desc",
  } satisfies IRecipeSharingPersonalizedFeed.IRequest;
  const response: IPageIRecipeSharingPersonalizedFeed.ISummary =
    await api.functional.recipeSharing.premiumUser.personalizedFeeds.index(
      connection,
      { body: requestBody },
    );
  typia.assert(response);

  // 6. Validate response correctness
  // Response pagination fields
  TestValidator.predicate(
    "pagination current page is 0 or more",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records and pages are zero or more",
    response.pagination.records >= 0 && response.pagination.pages >= 0,
  );

  // Data contains zero or more personalized feed summaries
  TestValidator.predicate("data is array", Array.isArray(response.data));

  // If data present, validate each summary contains required IDs
  if (response.data.length > 0) {
    for (const feedSummary of response.data) {
      TestValidator.predicate(
        "feedSummary contains valid id",
        typeof feedSummary.id === "string" && feedSummary.id.length > 0,
      );
      TestValidator.predicate(
        "feedSummary contains valid recipe_id",
        typeof feedSummary.recipe_id === "string" &&
          feedSummary.recipe_id.length > 0,
      );
      TestValidator.predicate(
        "feedSummary contains valid originator_user_id",
        typeof feedSummary.originator_user_id === "string" &&
          feedSummary.originator_user_id.length > 0,
      );
      TestValidator.predicate(
        "feedSummary contains valid created_at",
        typeof feedSummary.created_at === "string" &&
          feedSummary.created_at.length > 0,
      );
    }
  }
}
