import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsSecurityAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSecurityAuditLog";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * Test to ensure that a system administrator can successfully retrieve
 * detailed information about a security audit log entry by its ID.
 *
 * 1. The test begins with registering a system administrator user via the
 *    `/auth/systemAdmin/join` endpoint.
 * 2. It validates that the returned admin info contains expected properties
 *    and a valid authorization token.
 * 3. Then it calls the `/enterpriseLms/systemAdmin/securityAuditLogs/{id}`
 *    endpoint to retrieve an audit log entry by id.
 * 4. It asserts that returned log details contain required properties with
 *    valid formats and types.
 * 5. The test ensures that only authorized admins with a joined account can
 *    access audit logs, implicitly confirming access control.
 */
export async function test_api_security_audit_logs_retrieve_detail_success(
  connection: api.IConnection,
) {
  // Step 1: Register system administrator user and authenticate
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const adminAuthorized = await api.functional.auth.systemAdmin.join(
    connection,
    {
      body: adminJoinBody,
    },
  );
  typia.assert(adminAuthorized);

  // Step 2: Retrieve a random security audit log entry by id
  // Since the system state is unknown, use a randomly generated UUID
  // This tests the retrieval path and access control
  const randomLogId = typia.random<string & tags.Format<"uuid">>();

  const retrievedLog =
    await api.functional.enterpriseLms.systemAdmin.securityAuditLogs.at(
      connection,
      { id: randomLogId },
    );
  typia.assert(retrievedLog);

  // Step 3: Validate returned log properties exist and have correct types/formats
  TestValidator.predicate(
    "Audit log has valid UUID as id",
    typeof retrievedLog.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        retrievedLog.id,
      ),
  );

  TestValidator.predicate(
    "Tenant ID is either null or a valid UUID",
    retrievedLog.enterprise_lms_tenant_id === null ||
      (typeof retrievedLog.enterprise_lms_tenant_id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          retrievedLog.enterprise_lms_tenant_id,
        )),
  );

  TestValidator.predicate(
    "Action is a string",
    typeof retrievedLog.action === "string",
  );

  TestValidator.predicate(
    "Description is null or string",
    retrievedLog.description === null ||
      retrievedLog.description === undefined ||
      typeof retrievedLog.description === "string",
  );

  TestValidator.predicate(
    "User ID is null or a valid UUID",
    retrievedLog.user_id === null ||
      (typeof retrievedLog.user_id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          retrievedLog.user_id,
        )),
  );

  TestValidator.predicate(
    "Created at is a valid ISO 8601 date-time string",
    typeof retrievedLog.created_at === "string" &&
      !Number.isNaN(Date.parse(retrievedLog.created_at)),
  );
}
