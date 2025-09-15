import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerGuest";
import type { IOauthServerOauthServerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerGuest";

export async function test_api_oauth_server_guest_deletion_successful(
  connection: api.IConnection,
) {
  // 1. Create a guest user by calling join API and assert the authorized response
  const authorized: IOauthServerOauthServerGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {} satisfies IOauthServerGuest.ICreate,
    });
  typia.assert(authorized);

  // 2. Confirm the obtained id and token properties exist and have expected formats
  typia.assert<string & tags.Format<"uuid">>(authorized.id);
  typia.assert<IAuthorizationToken>(authorized.token);

  // 3. Call erase delete API to delete the guest by id and assert void result
  await api.functional.oauthServer.guest.oauthServerGuests.erase(connection, {
    id: authorized.id,
  });

  // 4. Attempt to delete the same guest again - expect an error due to non-existence
  await TestValidator.error(
    "deleting an already deleted guest should fail",
    async () => {
      await api.functional.oauthServer.guest.oauthServerGuests.erase(
        connection,
        {
          id: authorized.id,
        },
      );
    },
  );
}
