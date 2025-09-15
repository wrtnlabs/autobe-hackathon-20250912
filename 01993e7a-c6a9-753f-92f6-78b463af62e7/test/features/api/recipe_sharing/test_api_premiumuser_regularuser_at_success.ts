import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingPremiumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingPremiumUser";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";

/**
 * Validate retrieving detailed information of a premium user querying for a
 * regular user by ID.
 *
 * This test:
 *
 * - Creates a premium user account via join to establish authentication context.
 * - Retrieves a regular user detail with a valid UUID (randomly generated due to
 *   lack of creation endpoint).
 * - Validates the returned regular user data matches IRecipeSharingRegularUser
 *   DTO including format checks on UUID and timestamp strings.
 * - Verifies unauthorized access is blocked using an unauthenticated connection.
 *
 * Due to absence of API for creating regular users, no test is made for invalid
 * UUID format inputs to avoid violating type safety.
 */
export async function test_api_premiumuser_regularuser_at_success(
  connection: api.IConnection,
) {
  // Create a premium user to establish authentication context
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(3),
  } satisfies IRecipeSharingPremiumUser.ICreate;

  const premiumUser = await api.functional.auth.premiumUser.join(connection, {
    body: createBody,
  });
  typia.assert(premiumUser);

  // Generate a random UUID to simulate a regular user ID
  const regularUserId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve regular user information with valid premium user context
  const regularUser =
    await api.functional.recipeSharing.premiumUser.regularUsers.at(connection, {
      id: regularUserId,
    });

  typia.assert(regularUser);

  // Validate id is valid UUID format
  TestValidator.predicate(
    "valid UUID for regular user id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      regularUser.id,
    ),
  );

  // Validate created_at is ISO 8601 datetime string
  TestValidator.predicate(
    "valid ISO date-time for created_at",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
      regularUser.created_at,
    ),
  );

  // Validate updated_at is ISO 8601 datetime string
  TestValidator.predicate(
    "valid ISO date-time for updated_at",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
      regularUser.updated_at,
    ),
  );

  // Validate deleted_at is either null or ISO 8601 datetime string
  TestValidator.predicate(
    "deleted_at is null or valid ISO date-time",
    regularUser.deleted_at === null ||
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
        regularUser.deleted_at ?? "",
      ),
  );

  // Unauthorized access check: Use a connection without authorization header
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated connection should deny access",
    async () => {
      await api.functional.recipeSharing.premiumUser.regularUsers.at(
        unauthConnection,
        {
          id: regularUserId,
        },
      );
    },
  );
}
