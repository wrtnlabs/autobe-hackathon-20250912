import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEnterpriseLmsComplianceRecords } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsComplianceRecords";
import type { IEnterpriseLmsCorporateLearner } from "@ORGANIZATION/PROJECT-api/lib/structures/IEnterpriseLmsCorporateLearner";

/**
 * Tests retrieval of a specific compliance record's detailed information by an
 * authorized corporate learner.
 *
 * The test covers the following steps:
 *
 * 1. Create and authenticate as a new corporate learner using the join API.
 * 2. Log in as the created corporate learner to obtain authorization tokens.
 * 3. Use a realistic compliance record ID (random UUID) to retrieve detailed
 *    record.
 * 4. Validate all key fields of the compliance record, including IDs, tenant
 *    linkage, compliance status and timestamps.
 * 5. Test handling of unauthorized access by attempting retrieval without
 *    authentication.
 * 6. Verify error handling by querying a non-existent compliance record ID.
 *
 * Throughout, the test maintains strict DTO type usage, schema-compliant
 * property values, and thorough assertion with typia.assert and TestValidator.
 * Authentication headers are handled automatically by the SDK during join and
 * login.
 */
export async function test_api_compliance_record_detail_retrieval_authorized_access(
  connection: api.IConnection,
) {
  // 1. Create corporate learner account
  const createBody = {
    tenant_id: typia.random<string & tags.Format<"uuid">>(),
    email: `${RandomGenerator.name(1).replace(/\s/g, "").toLowerCase()}@example.com`,
    password: "P@ssw0rd123",
    first_name: RandomGenerator.name(1),
    last_name: RandomGenerator.name(1),
  } satisfies IEnterpriseLmsCorporateLearner.ICreate;

  const joined: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.join(connection, {
      body: createBody,
    });
  typia.assert(joined);

  // 2. Log in as corporate learner
  const loginBody = {
    email: createBody.email,
    password: createBody.password,
  } satisfies IEnterpriseLmsCorporateLearner.ILogin;
  const loggedIn: IEnterpriseLmsCorporateLearner.IAuthorized =
    await api.functional.auth.corporateLearner.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // 3. Retrieve a compliance record by a random UUID
  const complianceId = typia.random<string & tags.Format<"uuid">>();
  const complianceRecord: IEnterpriseLmsComplianceRecords =
    await api.functional.enterpriseLms.corporateLearner.complianceRecords.atComplianceRecord(
      connection,
      { id: complianceId },
    );
  typia.assert(complianceRecord);

  // 4. Validate response fields
  TestValidator.predicate(
    "complianceRecord id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      complianceRecord.id,
    ),
  );
  TestValidator.equals(
    "tenant_id matches loggedIn tenant_id",
    complianceRecord.tenant_id,
    loggedIn.tenant_id,
  );
  TestValidator.equals(
    "learner_id matches loggedIn id",
    complianceRecord.learner_id,
    loggedIn.id,
  );
  TestValidator.predicate(
    "created_at is ISO 8601 date",
    !isNaN(Date.parse(complianceRecord.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 date",
    !isNaN(Date.parse(complianceRecord.updated_at)),
  );

  // 5. Test error on unknown compliance record id
  await TestValidator.error(
    "unknown complianceRecord id should raise error",
    async () => {
      const invalidId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.enterpriseLms.corporateLearner.complianceRecords.atComplianceRecord(
        connection,
        { id: invalidId },
      );
    },
  );

  // 6. Test unauthorized access
  const unauthedConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.enterpriseLms.corporateLearner.complianceRecords.atComplianceRecord(
      unauthedConnection,
      { id: complianceId },
    );
  });
}
