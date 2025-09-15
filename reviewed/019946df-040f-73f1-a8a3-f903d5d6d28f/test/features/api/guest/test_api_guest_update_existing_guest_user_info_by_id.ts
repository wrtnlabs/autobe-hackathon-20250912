import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsGuest";

/**
 * Comprehensive E2E test for updating existing guest user information by
 * guestId.
 *
 * This test covers the full lifecycle of a guest user in the Enterprise LMS
 * system:
 *
 * 1. Creation of a new guest user to retrieve a valid guestId
 * 2. Updating the guest user's information including email, names, password
 *    hash, status, and soft deletion status
 * 3. Verification that updated fields are correctly persisted and returned
 * 4. Error handling test - attempt to update a non-existent guest user and
 *    expect failure
 *
 * All data generation respects DTO validation constraints such as UUID and
 * email formats. Asserts use typia for thorough type validation and
 * TestValidator for business logic verification.
 *
 * This ensures the update workflow is robust, tenant-aware, and behaves
 * correctly under normal and error conditions.
 */
export async function test_api_guest_update_existing_guest_user_info_by_id(
  connection: api.IConnection,
) {
  // 1. Create a new guest user to get a valid guestId
  const createBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsGuest.ICreate;

  const joinedGuest = await api.functional.auth.guest.join(connection, {
    body: createBody,
  });
  typia.assert(joinedGuest);

  // 2. Update the guest user's info
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
    deleted_at: null,
  } satisfies IEnterpriseLmsGuest.IUpdate;

  const updatedGuest = await api.functional.enterpriseLms.guest.guests.update(
    connection,
    {
      guestId: joinedGuest.id,
      body: updateBody,
    },
  );
  typia.assert(updatedGuest);

  // 3. Assert that updated fields match the update request
  TestValidator.equals(
    "updated guest email matches",
    updatedGuest.email,
    updateBody.email,
  );
  TestValidator.equals(
    "updated guest first name matches",
    updatedGuest.first_name,
    updateBody.first_name,
  );
  TestValidator.equals(
    "updated guest last name matches",
    updatedGuest.last_name,
    updateBody.last_name,
  );
  TestValidator.equals(
    "updated guest status matches",
    updatedGuest.status,
    updateBody.status,
  );
  TestValidator.equals(
    "updated guest deleted_at matches",
    updatedGuest.deleted_at,
    updateBody.deleted_at,
  );
  TestValidator.equals(
    "updated guest tenant_id remains unchanged",
    updatedGuest.tenant_id,
    joinedGuest.tenant_id,
  );

  // 4. Attempt updating a non-existent guest user - expect an error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  if (nonExistentId !== joinedGuest.id) {
    await TestValidator.error(
      "update non-existent guest user should fail",
      async () => {
        await api.functional.enterpriseLms.guest.guests.update(connection, {
          guestId: nonExistentId,
          body: updateBody,
        });
      },
    );
  }
}
