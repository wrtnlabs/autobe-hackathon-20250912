import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerGuest";
import type { IOauthServerOauthServerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerGuest";

/**
 * Test successful update of OAuth server guest user record.
 *
 * This test verifies that a guest user can be joined (created) and then
 * updated properly. It confirms correct handling of timestamps and nullable
 * deleted_at field. It verifies the updated guest ID matches and the
 * response structure is correct.
 */
export async function test_api_oauth_server_guest_update_successful(
  connection: api.IConnection,
) {
  // 1. Create a guest user via join operation
  const guest: IOauthServerOauthServerGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {} satisfies IOauthServerGuest.ICreate,
    });
  typia.assert(guest);

  // 2. Prepare update input with current ISO datetime strings and explicit null
  const now = new Date().toISOString();
  const updateBody: IOauthServerGuest.IUpdate = {
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  // 3. Perform update API call using guest id
  const updatedGuest: IOauthServerGuest =
    await api.functional.oauthServer.guest.oauthServerGuests.update(
      connection,
      {
        id: typia.assert<string & tags.Format<"uuid">>(guest.id),
        body: updateBody,
      },
    );
  typia.assert(updatedGuest);

  // 4. Validate updated guest data matches input and id matches join response
  TestValidator.equals("updated guest ID matches", updatedGuest.id, guest.id);
  TestValidator.equals(
    "updated created_at matches input",
    updatedGuest.created_at,
    updateBody.created_at,
  );
  TestValidator.equals(
    "updated updated_at matches input",
    updatedGuest.updated_at,
    updateBody.updated_at,
  );
  TestValidator.equals(
    "updated deleted_at matches input",
    updatedGuest.deleted_at,
    updateBody.deleted_at,
  );
}
