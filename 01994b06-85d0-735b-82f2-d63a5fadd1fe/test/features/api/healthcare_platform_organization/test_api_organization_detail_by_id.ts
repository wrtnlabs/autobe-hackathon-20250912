import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * E2E: GET /healthcarePlatform/systemAdmin/organizations/{organizationId}
 *
 * 1. Register a system admin (POST /auth/systemAdmin/join) with valid local
 *    credentials
 * 2. (Optional) Log in with those credentials using /auth/systemAdmin/login for
 *    session verification
 * 3. Create a new organization as system admin (POST
 *    /healthcarePlatform/systemAdmin/organizations)
 * 4. Retrieve the organization by its id using GET
 *    /healthcarePlatform/systemAdmin/organizations/{organizationId}
 * 5. Assert all response fields match the original creation input (code, name,
 *    status), and validate id/timestamps
 * 6. Edge case: Attempt to GET details with a random non-existent org UUID (expect
 *    error)
 *
 * Notes:
 *
 * - No API for archiving/deleting org (cannot test deleted/archived org fetch)
 * - No non-admin or role-changing API: cannot test unauthenticated/unauthorized
 *   fetch in current scope
 */
export async function test_api_organization_detail_by_id(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const joinInput = {
    email: adminEmail,
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinInput,
  });
  typia.assert(admin);
  TestValidator.equals(
    "system admin email matches join input",
    admin.email,
    adminEmail,
  );

  // 2. Optional: Login to revalidate credentials (not required if session persists)
  const loginOutput = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: joinInput.password,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginOutput);
  TestValidator.equals("login yields same admin id", loginOutput.id, admin.id);

  // 3. Create new organization
  const orgCreateInput = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(3),
    status: "active",
  } satisfies IHealthcarePlatformOrganization.ICreate;
  const createdOrg =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      { body: orgCreateInput },
    );
  typia.assert(createdOrg);
  TestValidator.equals(
    "org code matches input",
    createdOrg.code,
    orgCreateInput.code,
  );
  TestValidator.equals(
    "org name matches input",
    createdOrg.name,
    orgCreateInput.name,
  );
  TestValidator.equals(
    "org status matches input",
    createdOrg.status,
    orgCreateInput.status,
  );

  // 4. Retrieve organization details
  const retrieved =
    await api.functional.healthcarePlatform.systemAdmin.organizations.at(
      connection,
      {
        organizationId: createdOrg.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "organization ID matches created",
    retrieved.id,
    createdOrg.id,
  );
  TestValidator.equals(
    "organization code matches created",
    retrieved.code,
    createdOrg.code,
  );
  TestValidator.equals(
    "organization name matches created",
    retrieved.name,
    createdOrg.name,
  );
  TestValidator.equals(
    "organization status matches created",
    retrieved.status,
    createdOrg.status,
  );
  // Timestamps: created_at and updated_at must exist and are ISO8601
  TestValidator.predicate(
    "created_at is present",
    typeof retrieved.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof retrieved.updated_at === "string",
  );

  // 5. Error: GET with non-existent org UUID returns error
  const nonexistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching non-existent org by uuid fails",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.organizations.at(
        connection,
        {
          organizationId: nonexistentId,
        },
      );
    },
  );
  // Negative/unauthorized tests not executable: all endpoints require systemAdmin context
}
