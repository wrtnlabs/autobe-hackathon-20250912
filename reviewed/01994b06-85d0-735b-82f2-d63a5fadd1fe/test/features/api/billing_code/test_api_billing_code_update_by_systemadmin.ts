import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingCode";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test updating a billing code as a system admin.
 *
 * 1. Register a system admin and an organization admin (to create a billing
 *    code).
 * 2. Organization admin creates a billing code with valid fields.
 * 3. System admin logs in and updates billing code's name/description/active
 *    via systemAdmin endpoint.
 * 4. Assert changed fields reflect in response; immutable fields (code,
 *    code_system) remain unchanged.
 * 5. Non-existent billingCodeId triggers error.
 * 6. Attempting to update immutable fields is ignored or triggers error.
 * 7. Org admin is unable to update through systemAdmin endpoint (RBAC check,
 *    should fail).
 * 8. Validate updated_at field changes after update.
 */
export async function test_api_billing_code_update_by_systemadmin(
  connection: api.IConnection,
) {
  // Step 1: Register system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminPassword = RandomGenerator.alphaNumeric(12);
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdminJoin);
  const sysAdminLogin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        email: sysAdminEmail,
        provider: "local",
        provider_key: sysAdminEmail,
        password: sysAdminPassword,
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    },
  );
  typia.assert(sysAdminLogin);

  // Step 2: Register org admin
  const orgAdminEmail = typia.random<string & tags.Format<"email">>();
  const orgAdminPassword = RandomGenerator.alphaNumeric(12);
  const orgAdminJoin = await api.functional.auth.organizationAdmin.join(
    connection,
    {
      body: {
        email: orgAdminEmail,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        password: orgAdminPassword,
        provider: "local",
        provider_key: orgAdminEmail,
      } satisfies IHealthcarePlatformOrganizationAdmin.IJoin,
    },
  );
  typia.assert(orgAdminJoin);
  const orgAdminLogin = await api.functional.auth.organizationAdmin.login(
    connection,
    {
      body: {
        email: orgAdminEmail,
        password: orgAdminPassword,
        provider: "local",
        provider_key: orgAdminEmail,
      } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
    },
  );
  typia.assert(orgAdminLogin);

  // Step 3: Org admin creates a billing code
  const billingCodeCreate = {
    code: RandomGenerator.alphaNumeric(6),
    code_system: RandomGenerator.pick([
      "CPT",
      "ICD-10",
      "HCPCS",
      "DRG",
      "internal",
    ] as const),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    active: true,
  } satisfies IHealthcarePlatformBillingCode.ICreate;
  const created =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.create(
      connection,
      {
        body: billingCodeCreate,
      },
    );
  typia.assert(created);

  // Step 4: System admin logs in (again, to ensure context)
  await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: sysAdminEmail,
      provider: "local",
      provider_key: sysAdminEmail,
      password: sysAdminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });

  // Step 5: System admin updates modifiable fields (name, description, active)
  const updateBody = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    active: false,
  } satisfies IHealthcarePlatformBillingCode.IUpdate;
  const beforeUpdateTimestamp = created.updated_at;
  const updated =
    await api.functional.healthcarePlatform.systemAdmin.billingCodes.update(
      connection,
      {
        billingCodeId: created.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "billingCodeId remains the same",
    updated.id,
    created.id,
  );
  TestValidator.equals("code is immutable", updated.code, created.code);
  TestValidator.equals(
    "code_system is immutable",
    updated.code_system,
    created.code_system,
  );
  TestValidator.equals("name updated", updated.name, updateBody.name);
  TestValidator.equals(
    "description updated",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals("active updated", updated.active, updateBody.active);
  TestValidator.predicate(
    "updated_at changes after update",
    updated.updated_at !== beforeUpdateTimestamp,
  );

  // Step 6: Try to update immutable fields (should be ignored or error)
  // Attempting to update 'code' or 'code_system' will be ignored (they are not in IUpdate),
  // so updateBody can't include them - thus no-op for this test.

  // Step 7: System admin tries to update with a non-existent billingCodeId, expect error
  await TestValidator.error(
    "non-existent billingCodeId should cause error",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.billingCodes.update(
        connection,
        {
          billingCodeId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );

  // Step 8: Organization admin tries to update through systemAdmin endpoint (RBAC enforcement)
  // Switch to orgAdmin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAdminEmail,
      password: orgAdminPassword,
      provider: "local",
      provider_key: orgAdminEmail,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });
  await TestValidator.error(
    "organization admin is forbidden from updating via systemAdmin endpoint",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.billingCodes.update(
        connection,
        {
          billingCodeId: created.id,
          body: updateBody,
        },
      );
    },
  );
}
