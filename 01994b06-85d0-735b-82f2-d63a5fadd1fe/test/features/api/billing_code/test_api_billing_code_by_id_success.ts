import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingCode";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate that only an authenticated organization admin can retrieve
 * billing code details by ID.
 *
 * This test function performs an end-to-end scenario that covers:
 *
 * 1. Registering a new organization admin (to obtain required authentication
 *    context and access token)
 * 2. Creating a new billing code as admin, to produce a valid billing code ID
 * 3. Retrieving the billing code using its ID as the authenticated admin
 *    (success
 *
 *    - Should yield a full billing code record)
 * 4. Retrieving billing code with an invalid/nonexistent ID (error - not
 *    found)
 * 5. Attempting retrieval as an unauthenticated user (error - unauthorized)
 *
 * The function covers correct usage, authorization enforcement, and
 * edge-case error handling.
 */
export async function test_api_billing_code_by_id_success(
  connection: api.IConnection,
) {
  // 1. Register a new organization admin
  const orgAdminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphabets(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const orgAdmin = await api.functional.auth.organizationAdmin.join(
    connection,
    { body: orgAdminJoin },
  );
  typia.assert(orgAdmin);

  // 2. Create a billing code as the admin
  const billingCodeCreate = {
    code: RandomGenerator.alphaNumeric(6),
    code_system: RandomGenerator.name(1),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 4,
      wordMin: 5,
      wordMax: 10,
    }),
    active: true,
  } satisfies IHealthcarePlatformBillingCode.ICreate;
  const createdBillingCode =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.create(
      connection,
      { body: billingCodeCreate },
    );
  typia.assert(createdBillingCode);
  TestValidator.equals(
    "created code matches input",
    createdBillingCode.code,
    billingCodeCreate.code,
  );
  TestValidator.equals(
    "created code_system matches input",
    createdBillingCode.code_system,
    billingCodeCreate.code_system,
  );
  TestValidator.equals(
    "created name matches input",
    createdBillingCode.name,
    billingCodeCreate.name,
  );
  TestValidator.equals(
    "created active matches input",
    createdBillingCode.active,
    billingCodeCreate.active,
  );

  // 3. Retrieve billing code by ID (success)
  const retrievedBillingCode =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.at(
      connection,
      {
        billingCodeId: createdBillingCode.id,
      },
    );
  typia.assert(retrievedBillingCode);
  TestValidator.equals(
    "retrieved billingCode.id matches created",
    retrievedBillingCode.id,
    createdBillingCode.id,
  );
  TestValidator.equals(
    "retrieved billingCode.code matches created",
    retrievedBillingCode.code,
    createdBillingCode.code,
  );

  // 4. Try with an invalid/nonexistent billingCodeId (should error)
  await TestValidator.error(
    "should fail with invalid billingCodeId",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingCodes.at(
        connection,
        {
          billingCodeId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 5. Try as unauthenticated user (should error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("failed without authentication", async () => {
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.at(
      unauthConn,
      {
        billingCodeId: createdBillingCode.id,
      },
    );
  });
}
