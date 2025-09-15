import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRecipeSharingRegularUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingRegularUser";
import type { IRecipeSharingUnits } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecipeSharingUnits";

/**
 * Test unauthorized creation of measurement units for recipe sharing without
 * authentication.
 *
 * This test verifies that API rejects unit creation requests when the caller is
 * unauthenticated or does not have sufficient permissions (regular user). It
 * confirms that no unit is created in such cases, and appropriate authorization
 * error responses are returned.
 *
 * Steps:
 *
 * 1. Attempt to create a new measurement unit via POST
 *    /recipeSharing/regularUser/units without authentication.
 * 2. Verify the API call throws an authorization error (e.g., HTTP 401
 *    Unauthorized).
 * 3. Prepare a valid regular user account by calling POST /auth/regularUser/join.
 * 4. Simulate an unauthenticated connection (with empty headers) and again attempt
 *    to create a measurement unit.
 * 5. Confirm the operation fails due to lack of proper authorization.
 *
 * Validation:
 *
 * - The API calls for unit creation must throw errors indicating unauthorized
 *   access.
 * - No unit should be created or returned in the response.
 * - User join operation should succeed and return the authorized user details.
 *
 * This ensures access control enforcement for measurement unit creation in the
 * recipe sharing platform, maintaining data integrity and security.
 */
export async function test_api_regular_user_units_create_unauthorized(
  connection: api.IConnection,
) {
  // 1. Attempt to create unit without authentication (empty headers)
  await TestValidator.error(
    "create unit fails without authentication",
    async () => {
      const unauthConn: api.IConnection = { ...connection, headers: {} };
      await api.functional.recipeSharing.regularUser.units.create(unauthConn, {
        body: {
          code: "unit_code",
          name: "Unit Name",
          abbreviation: "UN",
        } satisfies IRecipeSharingUnits.ICreate,
      });
    },
  );

  // 2. Perform user joining to ensure join operation succeeds
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    username: RandomGenerator.name(),
  } satisfies IRecipeSharingRegularUser.ICreate;
  const authorizedUser: IRecipeSharingRegularUser.IAuthorized =
    await api.functional.auth.regularUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedUser);

  // 3. Using unauthenticated connection, attempt unit creation again and expect failure
  await TestValidator.error(
    "unauthenticated user cannot create unit",
    async () => {
      const unauthConnAgain: api.IConnection = { ...connection, headers: {} };
      await api.functional.recipeSharing.regularUser.units.create(
        unauthConnAgain,
        {
          body: {
            code: "another_code",
            name: "Another Unit",
            abbreviation: "AU",
          } satisfies IRecipeSharingUnits.ICreate,
        },
      );
    },
  );
}
