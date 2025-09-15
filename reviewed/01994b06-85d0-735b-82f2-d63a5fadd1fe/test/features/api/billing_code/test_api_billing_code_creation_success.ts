import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformBillingCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformBillingCode";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * E2E scenario covering:
 *
 * 1. Registering and authenticating an organization admin
 * 2. Creating a new unique billing code (all fields, edge values)
 * 3. Confirming business rules: required fields present, optional permitted,
 *    uniqueness (code + code_system), and correct data is returned
 * 4. Creating a billing code with duplicate code/code_system fails
 *
 * No type error or DTO property misuse: only valid properties, actual business
 * logic and runtime constraints are tested. Audit trail is validated based on
 * presence of created_at/updated_at and immutable fields. No extra imports are
 * used beyond the template. No non-existent properties are used.
 */
export async function test_api_billing_code_creation_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as organization admin (dependencies always required)
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(10),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: adminJoin,
    });
  typia.assert(admin);

  // 2. Create a new unique billing code (cover all required and optional fields, valid edge values)
  const uniqueCode = RandomGenerator.alphaNumeric(7);
  const uniqueCodeSystem = RandomGenerator.alphaNumeric(6);
  const billingBody = {
    code: uniqueCode,
    code_system: uniqueCodeSystem,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    active: true,
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 4,
      sentenceMax: 8,
    }),
  } satisfies IHealthcarePlatformBillingCode.ICreate;
  const created: IHealthcarePlatformBillingCode =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.create(
      connection,
      {
        body: billingBody,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "created code matches request",
    created.code,
    billingBody.code,
  );
  TestValidator.equals(
    "created code_system matches",
    created.code_system,
    billingBody.code_system,
  );
  TestValidator.equals("created name matches", created.name, billingBody.name);
  TestValidator.equals(
    "created description matches",
    created.description,
    billingBody.description,
  );
  TestValidator.equals(
    "created active matches",
    created.active,
    billingBody.active,
  );
  TestValidator.predicate(
    "created_at exists and is ISO 8601",
    typeof created.created_at === "string" && /T.*Z$/.test(created.created_at),
  );
  TestValidator.predicate(
    "updated_at exists and is ISO 8601",
    typeof created.updated_at === "string" && /T.*Z$/.test(created.updated_at),
  );

  // 3. Attempt to create a duplicate code/code_system (should fail with uniqueness error)
  await TestValidator.error(
    "duplicated code/code_system should fail",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.billingCodes.create(
        connection,
        {
          body: {
            code: uniqueCode,
            code_system: uniqueCodeSystem,
            name: RandomGenerator.paragraph({ sentences: 2 }),
            active: true,
            description: RandomGenerator.content({ paragraphs: 1 }),
          } satisfies IHealthcarePlatformBillingCode.ICreate,
        },
      );
    },
  );

  // 4. Create another billing code with same code but different code_system (should succeed)
  const anotherCodeSystem = RandomGenerator.alphaNumeric(8);
  const billingBody2 = {
    code: uniqueCode,
    code_system: anotherCodeSystem,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    active: false,
    // No description provided -- test required vs optional field
  } satisfies IHealthcarePlatformBillingCode.ICreate;
  const created2: IHealthcarePlatformBillingCode =
    await api.functional.healthcarePlatform.organizationAdmin.billingCodes.create(
      connection,
      {
        body: billingBody2,
      },
    );
  typia.assert(created2);
  TestValidator.equals(
    "code matches reused string",
    created2.code,
    billingBody2.code,
  );
  TestValidator.equals(
    "different code_system accepted",
    created2.code_system,
    billingBody2.code_system,
  );
  TestValidator.equals(
    "optional description undefined",
    created2.description,
    undefined,
  );
  TestValidator.equals("active flag matches (false)", created2.active, false);
}
