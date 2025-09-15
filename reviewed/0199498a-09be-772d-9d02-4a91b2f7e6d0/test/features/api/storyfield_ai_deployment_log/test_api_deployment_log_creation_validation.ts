import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiDeploymentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiDeploymentLog";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validate creation and business validation for deployment log entries (deploy,
 * rollback, hotfix) by a system administrator.
 *
 * This test covers:
 *
 * 1. Registering and logging in as a system admin
 * 2. Creating a valid deployment log entry (all required fields provided)
 * 3. Verifying correct persistence of log fields
 * 4. Attempting a duplicate deployment_label/environment pair (should fail
 *    business rule)
 * 5. Attempting invalid allowed values for action_type/status (should fail
 *    business rule)
 *
 * Negative test case for missing required fields is omitted per strict E2E
 * policy: Type errors must never be tested in E2E code.
 */
export async function test_api_deployment_log_creation_validation(
  connection: api.IConnection,
) {
  // 1. Register as system admin (unique)
  const extAdminId = RandomGenerator.alphaNumeric(16);
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@businessdomain.com`;
  const adminJoin: IStoryfieldAiSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        external_admin_id: extAdminId,
        email: adminEmail,
        actor_type: "systemAdmin",
      } satisfies IStoryfieldAiSystemAdmin.IJoin,
    });
  typia.assert(adminJoin);

  // 2. Login as system admin
  const adminLogin: IStoryfieldAiSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: {
        external_admin_id: extAdminId,
        email: adminEmail,
      } satisfies IStoryfieldAiSystemAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // Prepare valid log fields (allowed values from context)
  const validActionType = RandomGenerator.pick([
    "deploy",
    "rollback",
    "hotfix",
    "config-change",
  ] as const);
  const validStatus = RandomGenerator.pick([
    "success",
    "failed",
    "in-progress",
    "aborted",
  ] as const);
  const validEnv = RandomGenerator.pick([
    "production",
    "staging",
    "development",
  ] as const);
  const uniqueLabel = `v${RandomGenerator.alphaNumeric(6)}`;

  // 3. Create valid deployment log
  const createBody = {
    deployment_label: uniqueLabel,
    action_type: validActionType,
    environment: validEnv,
    initiated_by: adminJoin.email,
    status: validStatus,
    summary: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IStoryfieldAiDeploymentLog.ICreate;
  const log =
    await api.functional.storyfieldAi.systemAdmin.deploymentLogs.create(
      connection,
      { body: createBody },
    );
  typia.assert(log);
  TestValidator.equals(
    "log deployment_label persisted",
    log.deployment_label,
    uniqueLabel,
  );
  TestValidator.equals(
    "log action_type persisted",
    log.action_type,
    validActionType,
  );
  TestValidator.equals("log environment persisted", log.environment, validEnv);
  TestValidator.equals(
    "log initiated_by persisted",
    log.initiated_by,
    adminJoin.email,
  );
  TestValidator.equals("log status persisted", log.status, validStatus);
  TestValidator.equals(
    "log summary persisted",
    log.summary,
    createBody.summary,
  );

  // 4. Attempt duplicate deployment_label/environment (should fail business rule)
  await TestValidator.error(
    "duplicate deployment_label/environment rejected",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.deploymentLogs.create(
        connection,
        { body: { ...createBody } },
      );
    },
  );

  // 5. Attempt invalid action_type/status values (non-allowed strings)
  await TestValidator.error("invalid action_type field rejected", async () => {
    await api.functional.storyfieldAi.systemAdmin.deploymentLogs.create(
      connection,
      {
        body: {
          ...createBody,
          deployment_label: `${uniqueLabel}-bad1`,
          action_type: "not-a-valid-type",
        },
      },
    );
  });

  await TestValidator.error("invalid status field rejected", async () => {
    await api.functional.storyfieldAi.systemAdmin.deploymentLogs.create(
      connection,
      {
        body: {
          ...createBody,
          deployment_label: `${uniqueLabel}-bad2`,
          status: "not-a-valid-status",
        },
      },
    );
  });
}
