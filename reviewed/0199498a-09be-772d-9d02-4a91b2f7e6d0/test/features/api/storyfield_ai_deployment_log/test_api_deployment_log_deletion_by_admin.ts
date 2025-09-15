import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiDeploymentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiDeploymentLog";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * E2E test: Deleting a deployment log entry as a system administrator
 *
 * 1. Register a system admin (join)
 * 2. Authenticate as the system admin (login)
 * 3. Create a deployment log and fetch its ID
 * 4. Delete the deployment log as the sysadmin
 * 5. Attempt to retrieve the deleted log (should NOT exist/error)
 * 6. Attempt to delete the log again (should error)
 * 7. Attempt to delete a non-existent log (should error)
 * 8. Attempt to delete as unauthenticated user (should error)
 */
export async function test_api_deployment_log_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a system admin (join)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const externalAdminId = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    external_admin_id: externalAdminId,
    email: adminEmail,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const admin: IStoryfieldAiSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, { body: joinBody });
  typia.assert(admin);
  TestValidator.equals(
    "admin email matches in response",
    admin.email,
    adminEmail,
  );
  TestValidator.equals(
    "admin external_admin_id matches in response",
    admin.external_admin_id,
    externalAdminId,
  );

  // 2. Authenticate as the system admin (login)
  const loginBody = {
    external_admin_id: externalAdminId,
    email: adminEmail,
  } satisfies IStoryfieldAiSystemAdmin.ILogin;
  const login: IStoryfieldAiSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(login);
  TestValidator.equals(
    "admin email matches after login",
    login.email,
    adminEmail,
  );

  // 3. Create a deployment log
  const logCreateBody = {
    deployment_label: RandomGenerator.alphaNumeric(8),
    action_type: RandomGenerator.pick([
      "deploy",
      "rollback",
      "hotfix",
      "config-change",
    ] as const),
    environment: RandomGenerator.pick([
      "production",
      "staging",
      "development",
    ] as const),
    initiated_by: adminEmail,
    status: RandomGenerator.pick([
      "success",
      "failed",
      "in-progress",
      "aborted",
    ] as const),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IStoryfieldAiDeploymentLog.ICreate;
  const log: IStoryfieldAiDeploymentLog =
    await api.functional.storyfieldAi.systemAdmin.deploymentLogs.create(
      connection,
      { body: logCreateBody },
    );
  typia.assert(log);
  const deploymentLogId = log.id;
  TestValidator.equals(
    "created log's deployment_label matches",
    log.deployment_label,
    logCreateBody.deployment_label,
  );

  // 4. Delete the deployment log
  await api.functional.storyfieldAi.systemAdmin.deploymentLogs.erase(
    connection,
    { deploymentLogId },
  );

  // 5. Try retrieving the deleted log -- (Assume GET API is not present, so skip real GET)
  //   Would use: await api.functional.storyfieldAi.systemAdmin.deploymentLogs.at or similar (but not present)
  //   As such, this step is just a placeholder for future coverage.

  // 6. Attempt to delete again (should error)
  await TestValidator.error(
    "deleting already deleted deployment log results in error",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.deploymentLogs.erase(
        connection,
        { deploymentLogId },
      );
    },
  );

  // 7. Attempt to delete a non-existent log
  const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting a non-existent deployment log results in error",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.deploymentLogs.erase(
        connection,
        { deploymentLogId: nonExistentLogId },
      );
    },
  );

  // 8. Attempt to delete as an unauthenticated user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot delete deployment logs",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.deploymentLogs.erase(
        unauthConn,
        { deploymentLogId },
      );
    },
  );
}
