import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRecipes } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRecipes";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * E2E Test for creating a new recipe by a regular user with successful user
 * registration and login.
 *
 * This test covers the full user flow:
 *
 * 1. Register a new regular user using the join API.
 * 2. Authenticate the user by logging in.
 * 3. Use the authenticated user's ID to create a new recipe with valid data.
 *
 * Validates that the created recipe has proper IDs, timestamps, and matches
 * input data for title, description, status, and created_by_id. Ensures the
 * authorization tokens are correctly handled during the user sign-up and
 * login process.
 */
export async function test_api_recipe_creation_success_regularuser(
  connection: api.IConnection,
) {
  // 1. Register a new regular user
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const joinResult: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joinResult);

  // Validate join response contains required properties
  TestValidator.predicate(
    "joinResult.id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      joinResult.id,
    ),
  );
  TestValidator.equals(
    "joinResult.email matches input",
    joinResult.email,
    joinBody.email,
  );
  TestValidator.equals(
    "joinResult.username matches input",
    joinResult.username,
    joinBody.username,
  );

  // 2. Login the same user
  const loginBody = {
    email: joinBody.email,
    password_hash: joinBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;

  const loginResult: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);

  TestValidator.equals(
    "loginResult.id equals joinResult.id",
    loginResult.id,
    joinResult.id,
  );
  TestValidator.equals(
    "loginResult.email equals joinBody.email",
    loginResult.email,
    loginBody.email,
  );
  TestValidator.equals(
    "loginResult.username equals joinResult.username",
    loginResult.username,
    joinResult.username,
  );

  // 3. Create a new recipe using authenticated user ID
  const createRecipeBody = {
    created_by_id: loginResult.id,
    title: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 8,
    }),
    status: "draft",
  } satisfies IRecipeSharingRecipes.ICreate;

  const createResult: IRecipeSharingRecipes =
    await api.functional.recipeSharing.regularUser.recipes.create(connection, {
      body: createRecipeBody,
    });
  typia.assert(createResult);

  // Validate returned recipe data
  TestValidator.predicate(
    "createResult.id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      createResult.id,
    ),
  );
  TestValidator.equals(
    "createResult.created_by_id matches loginResult.id",
    createResult.created_by_id,
    loginResult.id,
  );
  TestValidator.equals(
    "createResult.title matches input",
    createResult.title,
    createRecipeBody.title,
  );
  TestValidator.equals(
    "createResult.status matches input",
    createResult.status,
    createRecipeBody.status,
  );
  // Description can be null or string
  TestValidator.predicate(
    "createResult.description is null or string",
    createResult.description === null ||
      typeof createResult.description === "string",
  );

  // Validate timestamps are ISO date-time strings
  TestValidator.predicate(
    "createResult.created_at valid ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/.test(
      createResult.created_at,
    ),
  );
  TestValidator.predicate(
    "createResult.updated_at valid ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/.test(
      createResult.updated_at,
    ),
  );

  // deleted_at can be undefined or null
  if (
    createResult.deleted_at !== null &&
    createResult.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "createResult.deleted_at valid ISO date-time",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/.test(
        createResult.deleted_at,
      ),
    );
  }
}
