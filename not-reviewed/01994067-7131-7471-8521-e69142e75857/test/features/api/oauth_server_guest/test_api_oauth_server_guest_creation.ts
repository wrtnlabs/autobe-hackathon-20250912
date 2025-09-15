import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerGuest";
import type { IOauthServerOauthServerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerGuest";

/**
 * Validate the creation of a guest user entity without requiring prior
 * authentication.
 *
 * This test function verifies that a guest user account can be successfully
 * created using the OAuth server guest creation API. It first creates a
 * guest authentication context by calling the guest join endpoint, then
 * creates a new guest entity.
 *
 * The test asserts that the returned guest entity contains a valid UUID
 * 'id' and auditing timestamps 'created_at' and 'updated_at'. It also
 * ensures that the 'deleted_at' property is explicitly null or undefined,
 * representing a non-deleted guest.
 *
 * This scenario ensures that unauthenticated guest creation works correctly
 * with all required minimal data and auditing fields present.
 *
 * Steps:
 *
 * 1. Perform guest join for authentication.
 * 2. Create a new guest entity with an empty create body.
 * 3. Validate the returned OAuth server guest entity for correct schema
 *    compliance.
 */
export async function test_api_oauth_server_guest_creation(
  connection: api.IConnection,
) {
  // 1. Perform guest authentication join
  const guestAuth: IOauthServerOauthServerGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {},
    });
  typia.assert(guestAuth);

  // 2. Create new OAuth server guest entity with empty create body
  const guest: IOauthServerGuest =
    await api.functional.oauthServer.guest.oauthServerGuests.create(
      connection,
      {
        body: {},
      },
    );
  typia.assert(guest);

  // 3. Validate required properties
  TestValidator.predicate(
    "guest id should be a string",
    typeof guest.id === "string",
  );
  TestValidator.predicate(
    "guest created_at should be a string",
    typeof guest.created_at === "string",
  );
  TestValidator.predicate(
    "guest updated_at should be a string",
    typeof guest.updated_at === "string",
  );

  // 4. Validate deleted_at explicitly against null or undefined
  TestValidator.predicate(
    "guest deleted_at should be either null or undefined",
    guest.deleted_at === null || guest.deleted_at === undefined,
  );
}
