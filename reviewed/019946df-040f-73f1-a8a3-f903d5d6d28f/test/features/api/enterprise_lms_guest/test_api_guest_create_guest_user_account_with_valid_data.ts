import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";

export async function test_api_guest_create_guest_user_account_with_valid_data(
  connection: api.IConnection,
) {
  // Step 1: Create guest user authentication context by joining via /auth/guest/join
  const guestCreateBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: (RandomGenerator.alphaNumeric(10) +
      "@example.com") satisfies string & tags.Format<"email">,
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsGuest.ICreate;

  const guestAuth: IEnterpriseLmsGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, { body: guestCreateBody });
  typia.assert(guestAuth);

  // Step 2: Use the authorized tenant_id and unique email to create another guest user
  const newGuestCreateBody = {
    tenant_id: guestAuth.tenant_id,
    email: (RandomGenerator.alphaNumeric(10) +
      "@example.com") satisfies string & tags.Format<"email">,
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsGuest.ICreate;

  const guest: IEnterpriseLmsGuest =
    await api.functional.enterpriseLms.guest.guests.create(connection, {
      body: newGuestCreateBody,
    });
  typia.assert(guest);

  // The response tenant_id must match the request
  TestValidator.equals(
    "tenant_id matches",
    guest.tenant_id,
    newGuestCreateBody.tenant_id,
  );

  // The email must match
  TestValidator.equals("email matches", guest.email, newGuestCreateBody.email);

  // The status must be 'active'
  TestValidator.equals("status is active", guest.status, "active");

  // Step 3: Failure case tests
  // Missing required field test skipped as creating invalid request body is forbidden

  // Invalid tenant_id format
  await TestValidator.error(
    "invalid tenant_id format is rejected",
    async () => {
      await api.functional.enterpriseLms.guest.guests.create(connection, {
        body: {
          tenant_id: "invalid-uuid-format",
          email: (RandomGenerator.alphaNumeric(10) +
            "@example.com") satisfies string & tags.Format<"email">,
          password_hash: RandomGenerator.alphaNumeric(64),
          first_name: RandomGenerator.name(1),
          last_name: RandomGenerator.name(1),
          status: "active",
        } satisfies IEnterpriseLmsGuest.ICreate,
      });
    },
  );

  // Duplicate email in the same tenant should be rejected
  await TestValidator.error(
    "duplicate email in tenant is rejected",
    async () => {
      await api.functional.enterpriseLms.guest.guests.create(connection, {
        body: {
          tenant_id: guestAuth.tenant_id,
          email: newGuestCreateBody.email,
          password_hash: RandomGenerator.alphaNumeric(64),
          first_name: RandomGenerator.name(1),
          last_name: RandomGenerator.name(1),
          status: "active",
        } satisfies IEnterpriseLmsGuest.ICreate,
      });
    },
  );
}
