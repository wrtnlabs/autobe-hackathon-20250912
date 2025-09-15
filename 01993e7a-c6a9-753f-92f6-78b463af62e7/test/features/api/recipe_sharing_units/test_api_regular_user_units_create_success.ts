import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUnits";

/**
 * Test scenario: Successful creation of a measurement unit by a regular
 * user.
 *
 * This test function validates the end-to-end flow starting from a regular
 * user joining the system (authentication setup) to creating a new
 * measurement unit. It ensures compliance with the API contracts and schema
 * validation.
 *
 * Steps:
 *
 * 1. Regular user joins via /auth/regularUser/join endpoint
 * 2. Assert successful join and completion of authentication
 * 3. Use the authenticated context to create a new measurement unit by POST to
 *    /recipeSharing/regularUser/units
 * 4. The creation request must include a unique code, name, and optionally an
 *    abbreviation
 * 5. Validate the response received from the unit creation:
 *
 *    - Id is a UUID string
 *    - Code and name match the input
 *    - Abbreviation matches the input or is null/undefined if not provided
 *    - Created_at and updated_at are ISO 8601 date-time strings
 * 6. Ensure that the deleted_at property is not returned (not present in
 *    response schema)
 */
export async function test_api_regular_user_units_create_success(
  connection: api.IConnection,
) {
  // 1. Regular user joins
  const userCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password_hash: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(2),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Create a new measurement unit
  const unitCreateBody = {
    code: RandomGenerator.alphaNumeric(4),
    name: RandomGenerator.name(2),
    abbreviation: RandomGenerator.alphaNumeric(2), // Optional property
  } satisfies IRecipeSharingUnits.ICreate;

  const createdUnit: IRecipeSharingUnits =
    await api.functional.recipeSharing.regularUser.units.create(connection, {
      body: unitCreateBody,
    });
  typia.assert(createdUnit);

  // 3. Validate returned properties
  TestValidator.predicate(
    "id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      createdUnit.id,
    ),
  );
  TestValidator.equals("code matches", createdUnit.code, unitCreateBody.code);
  TestValidator.equals("name matches", createdUnit.name, unitCreateBody.name);
  TestValidator.equals(
    "abbreviation matches optional or null",
    createdUnit.abbreviation ?? null,
    unitCreateBody.abbreviation ?? null,
  );

  // Both created_at and updated_at should be ISO 8601 date-time strings
  const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    dateTimeRegex.test(createdUnit.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date-time",
    dateTimeRegex.test(createdUnit.updated_at),
  );
}
