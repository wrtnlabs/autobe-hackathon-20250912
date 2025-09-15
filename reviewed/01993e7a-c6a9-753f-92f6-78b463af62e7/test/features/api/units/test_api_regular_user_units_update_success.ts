import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUnits";

/**
 * Validate updating an existing measurement unit.
 *
 * This test validates that a regular user can create a measurement unit and
 * subsequently update it successfully. It checks that the update operation
 * properly modifies fields such as code, name, abbreviation, and that the
 * updated_at timestamp reflects the change. The test ensures complete type
 * safety and proper authorization by authenticating the user before
 * operations.
 *
 * Steps:
 *
 * 1. Authenticate a new regular user to obtain a valid session context.
 * 2. Create a new measurement unit with required fields (code, name) and
 *    optionally abbreviation.
 * 3. Update the measurement unit's code, name, and abbreviation.
 * 4. Assert that the updated unit reflects the new values and has a more
 *    recent updated_at timestamp.
 */
export async function test_api_regular_user_units_update_success(
  connection: api.IConnection,
) {
  // 1. Authenticate and join a new regular user
  const userJoinBody = {
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    username: RandomGenerator.alphaNumeric(6),
    password_hash: RandomGenerator.alphaNumeric(24),
  } satisfies IRecipeSharingRegularUser.ICreate;

  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: userJoinBody,
    });
  typia.assert(authorizedUser);

  // 2. Create a new measurement unit
  const unitCreateBody = {
    code: RandomGenerator.alphaNumeric(5),
    name: RandomGenerator.name(),
    abbreviation: RandomGenerator.alphaNumeric(3),
  } satisfies IRecipeSharingUnits.ICreate;

  const createdUnit: IRecipeSharingUnits =
    await api.functional.recipeSharing.regularUser.units.create(connection, {
      body: unitCreateBody,
    });
  typia.assert(createdUnit);

  // 3. Update the measurement unit
  const unitUpdateBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    abbreviation: null,
  } satisfies IRecipeSharingUnits.IUpdate;

  const updatedUnit: IRecipeSharingUnits =
    await api.functional.recipeSharing.regularUser.units.update(connection, {
      id: createdUnit.id,
      body: unitUpdateBody,
    });
  typia.assert(updatedUnit);

  // 4. Validate that updated data matches update request
  TestValidator.equals(
    "unit code updated",
    updatedUnit.code,
    unitUpdateBody.code,
  );
  TestValidator.equals(
    "unit name updated",
    updatedUnit.name,
    unitUpdateBody.name,
  );
  TestValidator.equals(
    "unit abbreviation updated to null",
    updatedUnit.abbreviation,
    null,
  );
  TestValidator.predicate(
    "updated_at timestamp is more recent",
    new Date(updatedUnit.updated_at) > new Date(createdUnit.updated_at),
  );
}
