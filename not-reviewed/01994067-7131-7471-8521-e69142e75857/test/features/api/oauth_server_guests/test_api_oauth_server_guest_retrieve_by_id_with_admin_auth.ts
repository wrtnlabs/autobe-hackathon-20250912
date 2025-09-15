import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerGuest";
import type { IOauthServerOauthServerGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerOauthServerGuest";
import type { IOauthServerguests } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerguests";

export async function test_api_oauth_server_guest_retrieve_by_id_with_admin_auth(
  connection: api.IConnection,
) {
  // 1. Admin authentication
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password: "P@ssw0rd123",
  } satisfies IOauthServerAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminCreateBody,
  });
  typia.assert(admin);

  // 2. Create guest user
  const guestCreateBody = {} satisfies IOauthServerGuest.ICreate;

  const guest = await api.functional.auth.guest.join(connection, {
    body: guestCreateBody,
  });
  typia.assert(guest);

  // 3. Retrieve guest details by ID
  const guestDetails =
    await api.functional.oauthServer.admin.oauthServerGuests.atGuest(
      connection,
      {
        id: guest.id,
      },
    );
  typia.assert(guestDetails);

  TestValidator.equals("guest ID matches", guestDetails.id, guest.id);

  TestValidator.predicate(
    "guest created_at is a valid date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{3})?Z$/.test(
      guestDetails.created_at,
    ),
  );

  TestValidator.predicate(
    "guest updated_at is a valid date-time",
    /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{3})?Z$/.test(
      guestDetails.updated_at,
    ),
  );

  if (
    guestDetails.deleted_at !== null &&
    guestDetails.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "guest deleted_at is a valid date-time",
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{3})?Z$/.test(
        guestDetails.deleted_at,
      ),
    );
  }

  // 4. Test unauthorized access (simulate unauthenticated connection)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthorized access to guest details should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthServerGuests.atGuest(
        unauthenticatedConnection,
        {
          id: guest.id,
        },
      );
    },
  );

  // 5. Test accessing non-existing guest ID
  const nonExistingId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "accessing non-existing guest ID should fail",
    async () => {
      await api.functional.oauthServer.admin.oauthServerGuests.atGuest(
        connection,
        {
          id: nonExistingId,
        },
      );
    },
  );
}
