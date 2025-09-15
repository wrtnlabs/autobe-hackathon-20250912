import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IOauthServerAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAdmin";
import type { IOauthServerAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IOauthServerAuditLog";

/**
 * Test scenario verifying the retrieval of a specific OAuth server audit log
 * entry by ID.
 *
 * The test authenticates as an admin user by creating a valid admin account,
 * then attempts to fetch audit log details by a valid UUID. It asserts the
 * returned data fields and formats, ensuring correctness and completeness of
 * the audit log details.
 *
 * Additionally, tests that requesting a non-existent audit log ID results in an
 * error.
 *
 * This validates strict admin authorization enforcement and precise audit log
 * retrieval capabilities.
 */
export async function test_api_oauth_server_audit_log_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Create admin user and authenticate
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    email_verified: true,
    password: "SecurePass123!",
  } satisfies IOauthServerAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // 2. Generate a valid audit log ID for testing
  const validAuditLogId = typia.random<string & tags.Format<"uuid">>();

  // 3. Call the admin audit log retrieval API
  const auditLog =
    await api.functional.oauthServer.admin.oauthServerAuditLogs.at(connection, {
      id: validAuditLogId,
    });
  typia.assert(auditLog);

  // 4. Validate audit log fields
  TestValidator.predicate(
    "auditLog.id is valid UUID",
    typeof auditLog.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        auditLog.id,
      ),
  );
  TestValidator.predicate(
    "auditLog.event_type is non-empty string",
    typeof auditLog.event_type === "string" && auditLog.event_type.length > 0,
  );
  TestValidator.predicate(
    "auditLog.event_timestamp is ISO date-time string",
    typeof auditLog.event_timestamp === "string" &&
      !isNaN(Date.parse(auditLog.event_timestamp)),
  );
  if (auditLog.actor_id !== null && auditLog.actor_id !== undefined) {
    TestValidator.predicate(
      "auditLog.actor_id is null or valid UUID",
      typeof auditLog.actor_id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          auditLog.actor_id,
        ),
    );
  } else {
    TestValidator.equals("auditLog.actor_id is null", auditLog.actor_id, null);
  }
  if (auditLog.actor_type !== null && auditLog.actor_type !== undefined) {
    TestValidator.predicate(
      "auditLog.actor_type is string or null",
      typeof auditLog.actor_type === "string",
    );
  } else {
    TestValidator.equals(
      "auditLog.actor_type is null",
      auditLog.actor_type,
      null,
    );
  }
  TestValidator.predicate(
    "auditLog.event_description is string",
    typeof auditLog.event_description === "string",
  );
  TestValidator.predicate(
    "auditLog.created_at is ISO date-time string",
    typeof auditLog.created_at === "string" &&
      !isNaN(Date.parse(auditLog.created_at)),
  );
  TestValidator.predicate(
    "auditLog.updated_at is ISO date-time string",
    typeof auditLog.updated_at === "string" &&
      !isNaN(Date.parse(auditLog.updated_at)),
  );
  if (auditLog.deleted_at !== null && auditLog.deleted_at !== undefined) {
    TestValidator.predicate(
      "auditLog.deleted_at is null or ISO date-time string",
      typeof auditLog.deleted_at === "string" &&
        !isNaN(Date.parse(auditLog.deleted_at)),
    );
  } else {
    TestValidator.equals(
      "auditLog.deleted_at is null",
      auditLog.deleted_at,
      null,
    );
  }

  // 5. Test retrieval with non-existent ID returns error
  await TestValidator.error(
    "retrieval with non-existent audit log id should fail",
    async () => {
      const randomNonExistentId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.oauthServer.admin.oauthServerAuditLogs.at(
        connection,
        {
          id: randomNonExistentId,
        },
      );
    },
  );
}
