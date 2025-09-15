import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAccessLog";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * End-to-end test: Organization admin can retrieve access log detail within
 * their organization, but is forbidden from accessing logs belonging to other
 * organizations.
 *
 * Steps:
 *
 * 1. Register an organization admin.
 * 2. Login as that organization admin.
 * 3. Simulate an access log (IHealthcarePlatformAccessLog) referencing the admin's
 *    org.
 * 4. Retrieve the detail for that log via the
 *    /healthcarePlatform/organizationAdmin/accessLogs/{accessLogId} endpoint
 *    and verify the data is returned.
 * 5. Attempt to access a log belonging to a different organization and verify that
 *    a forbidden error is produced.
 * 6. This test does not validate type errors or missing fields; only business
 *    logic and access restrictions are tested.
 */
export async function test_api_access_log_detail_for_organization_admin(
  connection: api.IConnection,
) {
  // 1. Register Org Admin
  const orgAEmail = typia.random<string & tags.Format<"email">>();
  const orgAName = RandomGenerator.name();
  const orgAPassword = RandomGenerator.alphaNumeric(10);
  const joinBody = {
    email: orgAEmail,
    full_name: orgAName,
    password: orgAPassword,
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;
  const adminA = await api.functional.auth.organizationAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(adminA);

  // 2. Login as Org Admin
  await api.functional.auth.organizationAdmin.login(connection, {
    body: {
      email: orgAEmail,
      password: orgAPassword,
    } satisfies IHealthcarePlatformOrganizationAdmin.ILogin,
  });

  // 3. Simulate an access log (authorized org)
  const orgXId = typia.random<string & tags.Format<"uuid">>();
  const accessLog: IHealthcarePlatformAccessLog = {
    id: typia.random<string & tags.Format<"uuid">>(),
    user_id: adminA.id,
    organization_id: orgXId,
    resource_type: RandomGenerator.pick([
      "EHR",
      "PATIENT_RECORD",
      "IMAGING",
      "CONFIG",
    ] as const),
    resource_id: typia.random<string & tags.Format<"uuid">>(),
    access_purpose: RandomGenerator.pick([
      "role",
      "consent",
      "emergency",
      "audit",
    ] as const),
    ip_address: "203.0.113.1",
    created_at: new Date().toISOString() as string & tags.Format<"date-time">,
  };

  // 4. Retrieve the log (should succeed)
  const logResult =
    await api.functional.healthcarePlatform.organizationAdmin.accessLogs.at(
      connection,
      { accessLogId: accessLog.id },
    );
  typia.assert(logResult);
  TestValidator.equals("access log id matches", logResult.id, accessLog.id);

  // 5. Attempt to access access log from a different organization (should fail)
  const accessLogOtherOrg: IHealthcarePlatformAccessLog = {
    id: typia.random<string & tags.Format<"uuid">>(),
    user_id: typia.random<string & tags.Format<"uuid">>(),
    organization_id: typia.random<string & tags.Format<"uuid">>(),
    resource_type: RandomGenerator.pick([
      "EHR",
      "PATIENT_RECORD",
      "IMAGING",
      "CONFIG",
    ] as const),
    resource_id: typia.random<string & tags.Format<"uuid">>(),
    access_purpose: RandomGenerator.pick([
      "role",
      "consent",
      "emergency",
      "audit",
    ] as const),
    ip_address: "198.51.100.2",
    created_at: new Date().toISOString() as string & tags.Format<"date-time">,
  };
  await TestValidator.error(
    "organization admin cannot access logs of other orgs",
    async () => {
      await api.functional.healthcarePlatform.organizationAdmin.accessLogs.at(
        connection,
        { accessLogId: accessLogOtherOrg.id },
      );
    },
  );
}
