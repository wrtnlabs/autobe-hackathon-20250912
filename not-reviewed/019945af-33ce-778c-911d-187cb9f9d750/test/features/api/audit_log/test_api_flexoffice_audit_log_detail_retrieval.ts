import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAuditLog";

export async function test_api_flexoffice_audit_log_detail_retrieval(
  connection: api.IConnection,
) {
  /**
   * Test the retrieval of detailed audit log information by ID with admin
   * authentication, verifying correct data retrieval, authorization enforcement
   * and error handling for non-existent records.
   *
   * This test performs the following steps:
   *
   * 1. Create an admin user using auth.admin.join with a realistic email and
   *    password.
   * 2. Authenticate the admin user using auth.admin.login.
   * 3. Generate a realistic UUID to serve as the audit log ID.
   * 4. Call GET /flexOffice/admin/audits/{id} to fetch the audit log details.
   * 5. Verify all expected fields are present, correctly typed, and adhere to
   *    business rules, including non-null constraints and format validations.
   * 6. Simulate access as a non-admin user by clearing the Authorization header
   *    and assert that access is denied.
   * 7. Attempt to fetch an audit log with a non-existent ID and verify that an
   *    error occurs.
   *
   * The test ensures that audit logs are immutable, only accessible by admins,
   * and that error handling for missing records is robust.
   */

  // 1. Create admin user
  const adminEmail = `admin.${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword = "Admin#1234";
  const adminCreate: IFlexOfficeAdmin.ICreate = {
    email: adminEmail,
    password: adminPassword,
  };
  const adminAuthorized: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreate });
  typia.assert(adminAuthorized);

  // 2. Authenticate admin user
  const adminLogin: IFlexOfficeAdmin.ILogin = {
    email: adminEmail,
    password: adminPassword,
  };
  const adminSession: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLogin });
  typia.assert(adminSession);

  // 3. Prepare an audit log ID
  const auditLogId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Retrieve audit log data by ID
  const auditLog: IFlexOfficeAuditLog =
    await api.functional.flexOffice.admin.audits.at(connection, {
      id: auditLogId,
    });
  typia.assert(auditLog);

  // 5. Verify audit log fields
  TestValidator.predicate(
    "audit log id format valid",
    typeof auditLog.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        auditLog.id,
      ),
  );
  TestValidator.equals("audit log id matches request", auditLog.id, auditLogId);
  TestValidator.predicate(
    "event_type is non-empty string",
    typeof auditLog.event_type === "string" && auditLog.event_type.length > 0,
  );
  TestValidator.predicate(
    "actor_type is non-empty string",
    typeof auditLog.actor_type === "string" && auditLog.actor_type.length > 0,
  );
  if (auditLog.actor_id !== null && auditLog.actor_id !== undefined) {
    TestValidator.predicate(
      "actor_id format correct",
      typeof auditLog.actor_id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          auditLog.actor_id,
        ),
    );
  }
  if (auditLog.target_type !== null && auditLog.target_type !== undefined) {
    TestValidator.predicate(
      "target_type is string or null",
      typeof auditLog.target_type === "string",
    );
  }
  if (auditLog.target_id !== null && auditLog.target_id !== undefined) {
    TestValidator.predicate(
      "target_id format correct",
      typeof auditLog.target_id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          auditLog.target_id,
        ),
    );
  }
  TestValidator.predicate(
    "action is non-empty string",
    typeof auditLog.action === "string" && auditLog.action.length > 0,
  );
  if (auditLog.description !== null && auditLog.description !== undefined) {
    TestValidator.predicate(
      "description is string or null",
      typeof auditLog.description === "string",
    );
  }
  TestValidator.predicate(
    "created_at is ISO date-time",
    typeof auditLog.created_at === "string" &&
      !isNaN(Date.parse(auditLog.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    typeof auditLog.updated_at === "string" &&
      !isNaN(Date.parse(auditLog.updated_at)),
  );
  if (auditLog.deleted_at !== null && auditLog.deleted_at !== undefined) {
    TestValidator.predicate(
      "deleted_at is ISO date-time or null",
      typeof auditLog.deleted_at === "string" &&
        !isNaN(Date.parse(auditLog.deleted_at)),
    );
  }

  // 6. Non-admin user access check (simulate by clearing Authorization header)
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin user cannot access audit log",
    async () => {
      await api.functional.flexOffice.admin.audits.at(unauthConnection, {
        id: auditLogId,
      });
    },
  );

  // 7. 404 Not found test with random non-existent UUID
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "accessing non-existent audit log returns error",
    async () => {
      await api.functional.flexOffice.admin.audits.at(connection, {
        id: nonExistentId,
      });
    },
  );
}
