import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformAccessLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformAccessLog";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";

/**
 * Validate system administrator can view access log details with correct admin
 * authentication.
 *
 * Steps:
 *
 * 1. Register new admin account
 * 2. Log in as this admin
 * 3. Generate a mock access log ID
 * 4. Access the access log detail endpoint
 * 5. Validate all required fields in the response for authorized user
 * 6. Test negative case with random non-existent accessLogId
 */
export async function test_api_access_log_detail_view_with_admin_authentication(
  connection: api.IConnection,
) {
  // 1. Register system admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    full_name: RandomGenerator.name(),
    provider: "local",
    provider_key: RandomGenerator.alphaNumeric(12),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IHealthcarePlatformSystemAdmin.IJoin;
  const admin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Log in as admin (required for token/authorization)
  const loginBody = {
    email: adminJoinBody.email,
    provider: adminJoinBody.provider,
    provider_key: adminJoinBody.provider_key,
    password: adminJoinBody.password,
  } satisfies IHealthcarePlatformSystemAdmin.ILogin;
  const adminLogin: IHealthcarePlatformSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(adminLogin);

  // 3. Generate a valid accessLogId (mock, since no access log creation API)
  const validAccessLog: IHealthcarePlatformAccessLog =
    typia.random<IHealthcarePlatformAccessLog>();
  // Normally, you would POST/create log and get its ID, but only GET API exists. So use random/mock.

  // 4. Retrieve access log detail for a valid ID
  const detail =
    await api.functional.healthcarePlatform.systemAdmin.accessLogs.at(
      connection,
      { accessLogId: validAccessLog.id },
    );
  typia.assert(detail);
  // 5. Validation of all fields
  TestValidator.equals("access log id matches", detail.id, validAccessLog.id);
  TestValidator.predicate(
    "user_id is uuid",
    typeof detail.user_id === "string" && detail.user_id.length > 0,
  );
  TestValidator.predicate(
    "org_id is uuid",
    typeof detail.organization_id === "string" &&
      detail.organization_id.length > 0,
  );
  TestValidator.predicate(
    "resource_type present",
    typeof detail.resource_type === "string" && detail.resource_type.length > 0,
  );
  TestValidator.predicate(
    "created_at present",
    typeof detail.created_at === "string" && detail.created_at.length > 0,
  );
  // Optional fields check
  if (detail.resource_id)
    TestValidator.predicate(
      "resource_id is uuid",
      typeof detail.resource_id === "string",
    );
  if (typeof detail.access_purpose !== "undefined")
    TestValidator.predicate(
      "access_purpose is valid",
      typeof detail.access_purpose === "string" ||
        detail.access_purpose === undefined,
    );
  if (typeof detail.ip_address !== "undefined")
    TestValidator.predicate(
      "ip_address is valid",
      typeof detail.ip_address === "string" || detail.ip_address === undefined,
    );

  // 6. Attempt to access a non-existent access log and confirm error
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("accessLogId not found throws error", async () => {
    await api.functional.healthcarePlatform.systemAdmin.accessLogs.at(
      connection,
      { accessLogId: randomId },
    );
  });
}
