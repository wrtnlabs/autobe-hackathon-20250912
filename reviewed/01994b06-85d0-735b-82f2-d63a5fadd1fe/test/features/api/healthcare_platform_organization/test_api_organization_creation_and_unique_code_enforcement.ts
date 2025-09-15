import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test creation of a healthcare organization with unique code enforcement.
 *
 * Steps:
 *
 * 1. Register and authenticate system admin (prerequisite).
 * 2. Successfully create an organization with a unique code, name, and status.
 *
 *    - Validate response matches IHealthcarePlatformOrganization schema.
 *    - Validate persisted values match request body.
 * 3. Attempt creation with duplicate code; ensure it is rejected (business error,
 *    not type error).
 *
 *    - Confirm response is an error.
 */
export async function test_api_organization_creation_and_unique_code_enforcement(
  connection: api.IConnection,
) {
  // 1. Register and login system admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create organization with unique code
  const orgCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const organization: IHealthcarePlatformOrganization =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgCreateBody },
    );
  typia.assert(organization);
  // Field validations
  TestValidator.equals(
    "organization code matches input",
    organization.code,
    orgCreateBody.code,
  );
  TestValidator.equals(
    "organization name matches input",
    organization.name,
    orgCreateBody.name,
  );
  TestValidator.equals(
    "organization status matches input",
    organization.status,
    orgCreateBody.status,
  );
  TestValidator.predicate(
    "organization has id",
    typeof organization.id === "string" && organization.id.length > 0,
  );

  // 3. Attempt creation with duplicate code
  const orgCreateBodyDup = {
    code: orgCreateBody.code,
    name: RandomGenerator.name(3),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  await TestValidator.error(
    "duplicate organization code should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.organizations.create(
        connection,
        { body: orgCreateBodyDup },
      );
    },
  );
}
