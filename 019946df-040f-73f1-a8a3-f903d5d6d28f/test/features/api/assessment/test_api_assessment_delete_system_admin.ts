import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsAssessments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsAssessments";
import type { IEnterpriseLmsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsSystemAdmin";

/**
 * This test validates the assessment deletion functionality available to
 * systemAdmin users.
 *
 * It executes the following steps:
 *
 * 1. Registers a new systemAdmin user.
 * 2. Logs in as the newly registered systemAdmin user.
 * 3. Creates a new assessment under systemAdmin tenant.
 * 4. Deletes the created assessment.
 * 5. Verifies that the assessment is no longer accessible (implicit by deletion
 *    success).
 * 6. Attempts deletion with an invalid assessment ID to assert proper error
 *    handling.
 *
 * The test ensures role-based access control, tenant isolation, and proper
 * resource cleanup.
 */
export async function test_api_assessment_delete_system_admin(
  connection: api.IConnection,
) {
  // 1. Register a new systemAdmin user
  const userCreateBody = {
    email: `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@enterprise.test.com`,
    password_hash: RandomGenerator.alphaNumeric(64),
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
    status: "active",
  } satisfies IEnterpriseLmsSystemAdmin.ICreate;

  const systemAdmin: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: userCreateBody,
    });
  typia.assert(systemAdmin);

  // 2. Log in as the systemAdmin
  const loginBody = {
    email: userCreateBody.email,
    password_hash: userCreateBody.password_hash,
  } satisfies IEnterpriseLmsSystemAdmin.ILogin;

  const login: IEnterpriseLmsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.login(connection, {
      body: loginBody,
    });
  typia.assert(login);

  // 3. Create a new assessment under systemAdmin tenant
  const assessmentCreateBody = {
    tenant_id: systemAdmin.tenant_id,
    code: `ASMT-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    assessment_type: "quiz",
    max_score: 100,
    passing_score: 60,
    status: "active",
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    scheduled_start_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    scheduled_end_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
  } satisfies IEnterpriseLmsAssessments.ICreate;

  const createdAssessment: IEnterpriseLmsAssessments =
    await api.functional.enterpriseLms.systemAdmin.assessments.create(
      connection,
      {
        body: assessmentCreateBody,
      },
    );
  typia.assert(createdAssessment);

  TestValidator.equals(
    "created assessment tenant_id matches systemAdmin tenant",
    createdAssessment.tenant_id,
    systemAdmin.tenant_id,
  );

  // 4. Delete the created assessment
  await api.functional.enterpriseLms.systemAdmin.assessments.erase(connection, {
    assessmentId: createdAssessment.id,
  });

  // 5. Attempt to delete with the same assessmentId should error as it no longer exists
  await TestValidator.error(
    "deleting already deleted assessment throws",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.erase(
        connection,
        {
          assessmentId: createdAssessment.id,
        },
      );
    },
  );

  // 6. Attempt to delete with invalid assessmentId should error
  await TestValidator.error(
    "deleting non-existent assessmentId throws",
    async () => {
      await api.functional.enterpriseLms.systemAdmin.assessments.erase(
        connection,
        {
          assessmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
