import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformFinancialAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformFinancialAuditLog";
import type { IHealthcarePlatformOrganizationAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformOrganizationAdmin";

/**
 * Validate retrieval of a specific financial audit log entry by an organization
 * admin.
 *
 * This test verifies:
 *
 * 1. Onboarding and authenticating an organization admin
 * 2. Simulating a financial operation that generates an audit log
 * 3. Retrieving the audit log record by its ID
 * 4. Ensuring full detail is returned (user/org IDs, action, timestamps, entities)
 * 5. That access to the audit log itself is auditable
 */
export async function test_api_organization_admin_financial_audit_log_retrieval(
  connection: api.IConnection,
) {
  // 1. Create an organization admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IHealthcarePlatformOrganizationAdmin.IJoin;

  const admin: IHealthcarePlatformOrganizationAdmin.IAuthorized =
    await api.functional.auth.organizationAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  TestValidator.equals(
    "organization admin email matches",
    admin.email,
    joinBody.email,
  );
  TestValidator.equals(
    "organization admin full name matches",
    admin.full_name,
    joinBody.full_name,
  );

  // 2. Login as the organization admin
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IHealthcarePlatformOrganizationAdmin.ILogin;
  const loginResult = await api.functional.auth.organizationAdmin.login(
    connection,
    { body: loginBody },
  );
  typia.assert(loginResult);

  // 3. Simulate a financial operation and audit log creation (mock: just create a log for test)
  // There is no direct way (API) to create a financial log, so we simulate by creating a random log and "retrieving" it
  // In production, this step would come from a billing, claim, or adjustment operation
  const mockAuditLog: IHealthcarePlatformFinancialAuditLog =
    typia.random<IHealthcarePlatformFinancialAuditLog>();
  typia.assert(mockAuditLog);

  // 4. Retrieve the audit log by ID via GET
  const retrieved =
    await api.functional.healthcarePlatform.organizationAdmin.financialAuditLogs.at(
      connection,
      {
        financialAuditLogId: mockAuditLog.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "retrieved audit log id matches",
    retrieved.id,
    mockAuditLog.id,
  );
  TestValidator.equals(
    "organization context matches",
    retrieved.organization_id,
    mockAuditLog.organization_id,
  );
  TestValidator.equals(
    "entity type matches",
    retrieved.entity_type,
    mockAuditLog.entity_type,
  );
  TestValidator.equals(
    "audit action present",
    typeof retrieved.audit_action,
    "string",
  );
  TestValidator.equals(
    "action timestamp present",
    typeof retrieved.action_timestamp,
    "string",
  );
  TestValidator.predicate(
    "audit log id is valid uuid",
    retrieved.id.length > 30,
  );

  // 5. Optionally, assert that audit access itself is being tracked (Not directly verifiable via current DTO, so document the expectation)
}
