import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate organization administrator self-profile update workflow.
 *
 * 1. Register a new organization admin (via join API) and capture their id for
 *    test.
 * 2. Update admin info as themselves: change their email, full_name, and phone.
 * 3. Confirm all updated fields persist and are returned in the update response.
 * 4. Try illegal update: send extra fields outside allowed update DTO and assert
 *    error (should cause TypeScript compile error if attempted).
 * 5. Attempt update on (simulated) soft-deleted admin: forcefully update
 *    deleted_at on a real admin and try update (not testable with current API,
 *    so skip actual soft-deleted test step).
 * 6. Attempt update with invalid auth context (simulate by clearing
 *    connection.headers, should raise error).
 * 7. Attempt update with missing required fields (none are required, but try
 *    setting all to undefined).
 * 8. All validation is focused on business logic (no type error testing allowed
 *    per rules).
 */
export async function test_api_organization_admin_self_update_profile(
  connection: api.IConnection,
) {
  // 1. Register org admin (for test, acts as both registration and auth)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const authn: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(authn);

  // 2. Profile update as themselves
  const updateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IUpdate;
  const updateRes =
    await api.functional.healthcarePlatform.organizationAdmin.organizationadmins.update(
      connection,
      {
        organizationAdminId: authn.id,
        body: updateBody,
      },
    );
  typia.assert(updateRes);
  TestValidator.equals(
    "profile email updated",
    updateRes.email,
    updateBody.email,
  );
  TestValidator.equals(
    "profile full_name updated",
    updateRes.full_name,
    updateBody.full_name,
  );
  TestValidator.equals(
    "profile phone updated",
    updateRes.phone,
    updateBody.phone,
  );

  // 3. Re-update: partial update (just one field)
  const updateBody2 = {
    full_name: RandomGenerator.name(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IUpdate;
  const updateRes2 =
    await api.functional.healthcarePlatform.organizationAdmin.organizationadmins.update(
      connection,
      {
        organizationAdminId: authn.id,
        body: updateBody2,
      },
    );
  typia.assert(updateRes2);
  TestValidator.equals(
    "profile full_name updated again",
    updateRes2.full_name,
    updateBody2.full_name,
  );
  TestValidator.equals(
    "profile email unchanged",
    updateRes2.email,
    updateBody.email,
  );

  // 4. Error: update with null org ID (invalid UUID - should be runtime error, not type error)
  await TestValidator.error("update with invalid id should error", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.organizationadmins.update(
      connection,
      {
        organizationAdminId: "not-a-uuid" as any,
        body: {
          full_name: RandomGenerator.name(),
        } satisfies IHealthcarePlatformOrganizationAdmin.IUpdate,
      },
    );
  });

  // 5. Error: unauthorized update attempt.
  const connUnAuth: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("update as unauthorized actor", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.organizationadmins.update(
      connUnAuth,
      {
        organizationAdminId: authn.id,
        body: {
          full_name: RandomGenerator.name(),
        } satisfies IHealthcarePlatformOrganizationAdmin.IUpdate,
      },
    );
  });

  // 6. Error: update with all fields undefined (should succeed but fields unchanged)
  const updateRes3 =
    await api.functional.healthcarePlatform.organizationAdmin.organizationadmins.update(
      connection,
      {
        organizationAdminId: authn.id,
        body: {},
      },
    );
  typia.assert(updateRes3);
  TestValidator.equals(
    "profile values unchanged when update is empty",
    updateRes3.full_name,
    updateRes2.full_name,
  );
  TestValidator.equals(
    "profile email unchanged on empty update",
    updateRes3.email,
    updateRes2.email,
  );
}
