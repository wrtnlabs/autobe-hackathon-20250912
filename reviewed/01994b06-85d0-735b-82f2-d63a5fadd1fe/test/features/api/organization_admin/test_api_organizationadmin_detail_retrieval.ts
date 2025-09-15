import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate retrieval of an organization admin's profile detail by a system
 * admin.
 *
 * Workflow:
 *
 * 1. Register as a system admin (POST /auth/systemAdmin/join) and obtain a valid
 *    session.
 * 2. (If needed) Login as the system admin again (POST /auth/systemAdmin/login).
 * 3. Create a new organization admin (POST
 *    /healthcarePlatform/systemAdmin/organizationadmins).
 * 4. Fetch detail profile of the created organization admin by ID.
 * 5. Assert all expected business and audit fields are present; sensitive data
 *    (such as credentials) is never returned.
 * 6. Attempt retrieval with a non-existent ID, asserting correct error handling.
 */
export async function test_api_organizationadmin_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new system admin
  const sysAdminJoin = {
    email: `${RandomGenerator.alphaNumeric(8)}@example-company.com`,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    provider: "local",
    provider_key: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const sysAdmin = await api.functional.auth.systemAdmin.join(connection, {
    body: sysAdminJoin,
  });
  typia.assert(sysAdmin);
  // 2. Optional: re-login as system admin (testing login endpoint and session)
  const sysAdminLogin = {
    email: sysAdmin.email,
    provider: "local",
    provider_key: sysAdmin.email,
    password: sysAdminJoin.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const sysAdminSession = await api.functional.auth.systemAdmin.login(
    connection,
    { body: sysAdminLogin },
  );
  typia.assert(sysAdminSession);
  TestValidator.equals(
    "sys admin login should match join info",
    sysAdmin.email,
    sysAdminSession.email,
  );

  // 3. Create an organization admin
  const orgAdminCreate = {
    email: `${RandomGenerator.alphaNumeric(8)}@org-company.com`,
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IHealthcarePlatformOrganizationAdmin.ICreate;
  const orgAdmin =
    await api.functional.healthcarePlatform.systemAdmin.organizationadmins.create(
      connection,
      { body: orgAdminCreate },
    );
  typia.assert(orgAdmin);
  TestValidator.equals(
    "created organization's admin email",
    orgAdmin.email,
    orgAdminCreate.email,
  );

  // 4. Retrieve details about the organization admin
  const queried =
    await api.functional.healthcarePlatform.systemAdmin.organizationadmins.at(
      connection,
      { organizationAdminId: orgAdmin.id },
    );
  typia.assert(queried);
  TestValidator.equals(
    "organization admin id matches created",
    queried.id,
    orgAdmin.id,
  );
  TestValidator.equals(
    "organization admin email matches created",
    queried.email,
    orgAdmin.email,
  );
  TestValidator.equals(
    "organization admin full_name matches created",
    queried.full_name,
    orgAdmin.full_name,
  );
  TestValidator.equals(
    "organization admin phone matches created",
    queried.phone,
    orgAdmin.phone,
  );

  // Check audit fields (expect filled, non-null values)
  TestValidator.predicate(
    "created_at should be present and ISO string",
    typeof queried.created_at === "string" && queried.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at should be present and ISO string",
    typeof queried.updated_at === "string" && queried.updated_at.includes("T"),
  );
  TestValidator.equals(
    "deleted_at should be missing or null on active org admin",
    queried.deleted_at ?? null,
    null,
  );

  // 5. Sensitive data never exposed
  TestValidator.predicate(
    "should not have any credentials property",
    !("password" in queried),
  );

  // 6. Error scenario: retrieve with a random non-existent UUID
  const randomId = typia.random<string & tags.Format<"uuid">>();
  if (randomId !== orgAdmin.id) {
    await TestValidator.error(
      "fetching non-existent organization admin should fail",
      async () => {
        await api.functional.healthcarePlatform.systemAdmin.organizationadmins.at(
          connection,
          { organizationAdminId: randomId },
        );
      },
    );
  }
}
