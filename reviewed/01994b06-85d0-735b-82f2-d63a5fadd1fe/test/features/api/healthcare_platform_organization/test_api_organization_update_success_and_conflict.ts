import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganization";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Test updating a healthcare organization's properties as a system admin.
 *
 * Full business scenario:
 *
 * 1. Register a system admin and login to get tokens.
 * 2. Create two organizations with different unique codes.
 * 3. Update the first organization's code, name, and status.
 * 4. Validate return object and that updates are persisted.
 * 5. Try updating with duplicate code (from org2) -- expect error.
 * 6. Try updating with blank name, invalid status, missing all fields, or for
 *    nonexistent org ID -- expect errors.
 * 7. Try update with unauthenticated connection -- expect forbidden error.
 */
export async function test_api_organization_update_success_and_conflict(
  connection: api.IConnection,
) {
  // 1. Register and login as system admin
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@enterprise-corp.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminFullName = RandomGenerator.name();
  // Join
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: adminEmail,
      full_name: adminFullName,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(admin);

  // Login
  const loginResult = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      email: adminEmail,
      provider: "local",
      provider_key: adminEmail,
      password: adminPassword,
    } satisfies IHealthcarePlatformSystemAdmin.ILogin,
  });
  typia.assert(loginResult);

  // 2. Create two organizations with unique codes
  const org1Code = `ORG${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const org2Code = `ORG${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const org1Name = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const org2Name = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 8,
  });

  const org1 =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: org1Code,
          name: org1Name,
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(org1);

  const org2 =
    await api.functional.healthcarePlatform.systemAdmin.organizations.create(
      connection,
      {
        body: {
          code: org2Code,
          name: org2Name,
          status: "active",
        } satisfies IHealthcarePlatformOrganization.ICreate,
      },
    );
  typia.assert(org2);

  // 3. Successful update to org1
  const newOrg1Code = `ORG${RandomGenerator.alphaNumeric(6).toUpperCase()}`;
  const newOrg1Name = RandomGenerator.paragraph({ sentences: 2 });
  const newOrg1Status = "suspended"; // status string, spec allows any string

  const updateOrg1Body = {
    code: newOrg1Code,
    name: newOrg1Name,
    status: newOrg1Status,
  } satisfies IHealthcarePlatformOrganization.IUpdate;

  const updatedOrg1 =
    await api.functional.healthcarePlatform.systemAdmin.organizations.update(
      connection,
      {
        organizationId: org1.id,
        body: updateOrg1Body,
      },
    );
  typia.assert(updatedOrg1);
  // Validate persistence
  TestValidator.equals(
    "org1.id unchanged after update",
    updatedOrg1.id,
    org1.id,
  );
  TestValidator.equals("org1 code updated", updatedOrg1.code, newOrg1Code);
  TestValidator.equals("org1 name updated", updatedOrg1.name, newOrg1Name);
  TestValidator.equals(
    "org1 status updated",
    updatedOrg1.status,
    newOrg1Status,
  );

  // 4. Update with duplicate code -- expect error
  await TestValidator.error(
    "update org1 with org2's code should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.organizations.update(
        connection,
        {
          organizationId: org1.id,
          body: {
            code: org2.code, // deliberate conflict
          } satisfies IHealthcarePlatformOrganization.IUpdate,
        },
      );
    },
  );

  // 5. Update with blank name (invalid)
  await TestValidator.error(
    "update org1 with blank name should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.organizations.update(
        connection,
        {
          organizationId: org1.id,
          body: {
            name: "",
          } satisfies IHealthcarePlatformOrganization.IUpdate,
        },
      );
    },
  );
  // 6. Update with 'invalid' status (e.g., business rule violation if spec enforced)
  await TestValidator.error("update org1 with disallowed status", async () => {
    await api.functional.healthcarePlatform.systemAdmin.organizations.update(
      connection,
      {
        organizationId: org1.id,
        body: {
          status: "madeup_invalid_status",
        } satisfies IHealthcarePlatformOrganization.IUpdate,
      },
    );
  });
  // 7. Update with all fields omitted
  await TestValidator.error(
    "update org1 with no fields should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.organizations.update(
        connection,
        {
          organizationId: org1.id,
          body: {} satisfies IHealthcarePlatformOrganization.IUpdate,
        },
      );
    },
  );
  // 8. Update non-existent org
  await TestValidator.error(
    "update nonexistent organization should fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.organizations.update(
        connection,
        {
          organizationId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            name: "Nonexistent",
          } satisfies IHealthcarePlatformOrganization.IUpdate,
        },
      );
    },
  );
  // 9. Unauthenticated update attempt
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "update fails without admin authentication",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.organizations.update(
        unauthConn,
        {
          organizationId: org1.id,
          body: {
            name: "HackerOrg",
          } satisfies IHealthcarePlatformOrganization.IUpdate,
        },
      );
    },
  );
}
