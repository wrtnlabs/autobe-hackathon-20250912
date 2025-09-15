import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUnits";

/**
 * This test validates the retrieval of a measurement unit by its unique
 * UUID.
 *
 * The process involves:
 *
 * 1. Registering a new regular user account using the join API, establishing
 *    authentication with JWT tokens.
 * 2. Logging in as the regular user.
 * 3. Creating a measurement unit under the authenticated regular user context,
 *    specifying mandatory fields such as code and name, and optionally
 *    abbreviation.
 * 4. Retrieving the newly created measurement unit using its UUID via the get
 *    /units/{id} API.
 * 5. Asserting that the retrieved measurement unit data exactly matches the
 *    created data in all relevant fields, including audit timestamps.
 *
 * This test ensures both API endpoint functionality and authorization flow
 * correctness for regular users managing measurement units.
 */
export async function test_api_measurement_unit_retrieve_by_id(
  connection: api.IConnection,
) {
  // 1. Register a new regular user
  const joinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const authorized: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Login as the regular user
  const loginBody = {
    email: joinBody.email,
    password_hash: joinBody.password_hash,
  } satisfies IRecipeSharingRegularUser.ILogin;
  const authorizedLogin: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.login(connection, {
      body: loginBody,
    });
  typia.assert(authorizedLogin);

  // 3. Create a measurement unit
  const createBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(2),
    abbreviation: RandomGenerator.alphaNumeric(3),
  } satisfies IRecipeSharingUnits.ICreate;
  const createdUnit: IRecipeSharingUnits =
    await api.functional.recipeSharing.regularUser.units.create(connection, {
      body: createBody,
    });
  typia.assert(createdUnit);

  // 4. Retrieve the measurement unit by ID
  const retrievedUnit: IRecipeSharingUnits =
    await api.functional.recipeSharing.units.at(connection, {
      id: createdUnit.id,
    });
  typia.assert(retrievedUnit);

  // 5. Assertions to verify all fields
  TestValidator.equals("unit ID must match", retrievedUnit.id, createdUnit.id);
  TestValidator.equals(
    "unit code must match",
    retrievedUnit.code,
    createdUnit.code,
  );
  TestValidator.equals(
    "unit name must match",
    retrievedUnit.name,
    createdUnit.name,
  );
  TestValidator.equals(
    "unit abbreviation must match",
    retrievedUnit.abbreviation ?? null,
    createdUnit.abbreviation ?? null,
  );
  TestValidator.equals(
    "created_at timestamps must match",
    retrievedUnit.created_at,
    createdUnit.created_at,
  );
  TestValidator.equals(
    "updated_at timestamps must match",
    retrievedUnit.updated_at,
    createdUnit.updated_at,
  );
}
