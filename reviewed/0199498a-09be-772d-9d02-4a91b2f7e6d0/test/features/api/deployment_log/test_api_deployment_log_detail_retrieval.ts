import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiDeploymentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiDeploymentLog";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validate system admin can fetch deployment log details by ID and receive
 * correct errors for invalid IDs.
 *
 * 1. Register a system administrator
 * 2. Login as the system administrator
 * 3. Create a deployment log (remember its ID)
 * 4. Retrieve that log by ID and assert all details and types
 * 5. Attempt to retrieve a non-existent log (random UUID) and verify error
 */
export async function test_api_deployment_log_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register as system administrator
  const externalAdminId = RandomGenerator.alphaNumeric(10);
  const adminEmail = `${RandomGenerator.alphaNumeric(10)}@business.com`;
  const joinBody = {
    external_admin_id: externalAdminId,
    email: adminEmail,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const admin = await api.functional.auth.systemAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Login as system admin (using DTO contract: external_admin_id, email)
  const login = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: externalAdminId,
      email: adminEmail,
    } satisfies IStoryfieldAiSystemAdmin.ILogin,
  });
  typia.assert(login);

  // 3. Create deployment log
  const deploymentLogData = {
    deployment_label: RandomGenerator.paragraph({ sentences: 2 }),
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
    initiated_by: admin.email,
    status: RandomGenerator.pick([
      "success",
      "failed",
      "in-progress",
      "aborted",
    ] as const),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IStoryfieldAiDeploymentLog.ICreate;
  const createdLog =
    await api.functional.storyfieldAi.systemAdmin.deploymentLogs.create(
      connection,
      { body: deploymentLogData },
    );
  typia.assert(createdLog);

  // 4. Retrieve the deployment log by ID
  const readLog =
    await api.functional.storyfieldAi.systemAdmin.deploymentLogs.at(
      connection,
      { deploymentLogId: createdLog.id },
    );
  typia.assert(readLog);
  TestValidator.equals(
    "retrieved log matches creation label",
    readLog.deployment_label,
    deploymentLogData.deployment_label,
  );
  TestValidator.equals(
    "retrieved log matches creation action_type",
    readLog.action_type,
    deploymentLogData.action_type,
  );
  TestValidator.equals(
    "retrieved log matches creation environment",
    readLog.environment,
    deploymentLogData.environment,
  );
  TestValidator.equals(
    "retrieved log matches creation initiated_by",
    readLog.initiated_by,
    deploymentLogData.initiated_by,
  );
  TestValidator.equals(
    "retrieved log matches creation status",
    readLog.status,
    deploymentLogData.status,
  );
  TestValidator.equals(
    "retrieved log matches creation summary",
    readLog.summary,
    deploymentLogData.summary,
  );

  // 5. Try retrieving a non-existent deployment log
  const randomUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("retrieval with bogus ID should fail", async () => {
    await api.functional.storyfieldAi.systemAdmin.deploymentLogs.at(
      connection,
      { deploymentLogId: randomUUID },
    );
  });
}
