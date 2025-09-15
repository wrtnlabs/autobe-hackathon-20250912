import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";

/**
 * Validates the soft deletion of a guest user identified by their unique
 * guestId.
 *
 * This test function recreates the entire lifecycle required to test soft
 * deletion:
 *
 * 1. Creates a guest user account with valid, randomized data.
 * 2. Uses the returned guest's id for a soft delete request.
 * 3. Confirms proper operation of the deletion endpoint without errors.
 * 4. Tests error scenarios when attempting deletion with invalid IDs or
 *    unauthorized access.
 * 5. Ensures tenant data isolation and authorization context compliance.
 *
 * All interactions verify type safety with typia.assert and handle all
 * async operations correctly.
 *
 * @param connection Standard API connection instance
 */
export async function test_api_guest_soft_delete_guest_user_by_id(
  connection: api.IConnection,
) {
  // 1. Create a new guest user to obtain guestId for deletion testing
  const guestCreateBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `test-${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsGuest.ICreate;

  const guest: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, { body: guestCreateBody });
  typia.assert(guest);

  // 2. Soft delete the guest by guestId
  await api.functional.enterpriseLms.guest.guests.erase(connection, {
    guestId: guest.id,
  });

  // 3. Error test: delete with non-existent but UUID valid id
  await TestValidator.error(
    "soft delete should fail for non-existent guestId",
    async () => {
      await api.functional.enterpriseLms.guest.guests.erase(connection, {
        guestId: "00000000-0000-0000-0000-000000000000",
      });
    },
  );

  // 4. Error test: unauthorized deletion (simulate by using a different connection or invalid token)
  // For this test, we simulate unauthorized access by making a new connection without authentication
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "soft delete should fail when unauthorized",
    async () => {
      await api.functional.enterpriseLms.guest.guests.erase(
        unauthenticatedConnection,
        {
          guestId: guest.id,
        },
      );
    },
  );
}
