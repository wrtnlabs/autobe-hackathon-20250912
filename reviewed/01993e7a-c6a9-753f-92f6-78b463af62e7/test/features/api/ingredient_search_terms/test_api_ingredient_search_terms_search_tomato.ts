import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRecipeSharingIngredientSearchTerms } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecipeSharingIngredientSearchTerms";
import type { IRecipeSharingIngredientSearchTerms } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingIngredientSearchTerms";

export async function test_api_ingredient_search_terms_search_tomato(
  connection: api.IConnection,
) {
  // Step 1: Prepare the request body with pagination parameters and search term filter.
  const requestBody = {
    page: 1,
    limit: 20,
    search_term: "tomato",
    ingredient_id: null, // Explicitly null as per DTO allowing null
  } satisfies IRecipeSharingIngredientSearchTerms.IRequest;

  // Step 2: Call the API to retrieve paginated ingredient search terms matching 'tomato'
  const response: IPageIRecipeSharingIngredientSearchTerms =
    await api.functional.recipeSharing.ingredientSearchTerms.index(connection, {
      body: requestBody,
    });

  // Step 3: Validate the response structure and data integrity using typia assertion
  typia.assert(response);

  // Step 4: Validate pagination metadata correctness
  TestValidator.predicate(
    "pagination page should be 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 20",
    response.pagination.limit === 20,
  );

  // Step 5: Validate that each returned search term contains the substring 'tomato' case-insensitive
  for (const term of response.data) {
    TestValidator.predicate(
      `search term includes 'tomato' substring (id: ${term.id})`,
      term.search_term.toLowerCase().includes("tomato"),
    );
    // Validate that id and ingredient_id are non-empty strings
    TestValidator.predicate(
      `id is non-empty string (id: ${term.id})`,
      typeof term.id === "string" && term.id.length > 0,
    );
    TestValidator.predicate(
      `ingredient_id is non-empty string (id: ${term.id})`,
      typeof term.ingredient_id === "string" && term.ingredient_id.length > 0,
    );
  }
}
