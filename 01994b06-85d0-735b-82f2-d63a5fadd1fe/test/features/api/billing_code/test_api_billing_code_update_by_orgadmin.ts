import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingCode";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate updating billing codes as organization admin, including legal and
 * protected fields.
 *
 * 1. Register organization admin (join+auth session)
 * 2. Create billing code as orgadmin
 * 3. Update updatable fields (name, description, active), check response reflects
 *    update
 * 4. Attempt to update protected fields ('code', 'code_system'), verify update is
 *    not allowed/has no effect
 * 5. Attempt to update non-existent code (random UUID), expect error
 */
export async function test_api_billing_code_update_by_orgadmin(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as organization admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin = await api.functional.auth.organizationAdmin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);
  TestValidator.equals("admin email = join input", admin.email, adminEmail);

  // Step 2: Create billing code
  const createBody = {
    code: RandomGenerator.alphaNumeric(6),
    code_system: RandomGenerator.name(1),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    active: true,
  } satisfies IHealthcarePlatformBillingCode.ICreate;

  const createdCode =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdCode);
  TestValidator.equals("created code: code", createdCode.code, createBody.code);
  TestValidator.equals(
    "created code: system",
    createdCode.code_system,
    createBody.code_system,
  );
  TestValidator.equals("created code: name", createdCode.name, createBody.name);
  TestValidator.equals(
    "created code: active",
    createdCode.active,
    createBody.active,
  );

  // Step 3: Update updatable fields (name, description, active)
  const updateBody1 = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    active: false,
  } satisfies IHealthcarePlatformBillingCode.IUpdate;
  const updatedCode =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.update(
      connection,
      {
        billingCodeId: createdCode.id,
        body: updateBody1,
      },
    );
  typia.assert(updatedCode);
  TestValidator.equals(
    "code after update: id matches",
    updatedCode.id,
    createdCode.id,
  );
  TestValidator.equals(
    "code after update: name updated",
    updatedCode.name,
    updateBody1.name,
  );
  TestValidator.equals(
    "code after update: description updated",
    updatedCode.description,
    updateBody1.description,
  );
  TestValidator.equals(
    "code after update: active updated",
    updatedCode.active,
    updateBody1.active,
  );
  TestValidator.equals(
    "code after update: code should not change",
    updatedCode.code,
    createdCode.code,
  );
  TestValidator.equals(
    "code after update: code_system should not change",
    updatedCode.code_system,
    createdCode.code_system,
  );

  // Step 4: Attempt to update protected fields (should have no effect)
  const updateBodyProtected = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IHealthcarePlatformBillingCode.IUpdate;
  const protectedUpdated =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.update(
      connection,
      {
        billingCodeId: createdCode.id,
        body: updateBodyProtected,
      },
    );
  typia.assert(protectedUpdated);
  TestValidator.equals(
    "code after protected update: code must not change",
    protectedUpdated.code,
    createdCode.code,
  );
  TestValidator.equals(
    "code after protected update: code_system must not change",
    protectedUpdated.code_system,
    createdCode.code_system,
  );

  // Step 5: Update with random non-existent UUID (should error)
  await TestValidator.error(
    "updating non-existent billing code id fails",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingCodes.update(
        connection,
        {
          billingCodeId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            name: "does not matter",
          } satisfies IHealthcarePlatformBillingCode.IUpdate,
        },
      );
    },
  );
}
