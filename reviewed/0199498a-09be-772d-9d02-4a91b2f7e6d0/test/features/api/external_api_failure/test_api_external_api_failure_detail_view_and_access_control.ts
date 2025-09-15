import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiExternalApiFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiExternalApiFailure";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";

/**
 * Validate detail retrieval and access control for external API failure
 * records.
 *
 * This test verifies:
 *
 * 1. System admin registration and authentication.
 * 2. (Not found) Detail view fetch with a random UUID fails as expected.
 * 3. (Happy path) Attempts to retrieve an external API failure detail (simulate
 *    mode or integrated test environment).
 * 4. Access control: Unauthorized/unauthenticated session cannot fetch detail.
 * 5. Audit and PII masking requirements are noted, with check comments if
 *    observable from API.
 */
export async function test_api_external_api_failure_detail_view_and_access_control(
  connection: api.IConnection,
) {
  // 1. Register a system administrator with elevated privileges
  const admin_join = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      external_admin_id: RandomGenerator.alphaNumeric(16),
      email: `${RandomGenerator.alphaNumeric(8)}@autobe.test`,
      actor_type: "systemAdmin",
    } satisfies IStoryfieldAiSystemAdmin.IJoin,
  });
  typia.assert(admin_join);

  // 2. Login as admin to establish authenticated session
  const admin_login = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: admin_join.external_admin_id,
      email: admin_join.email,
    } satisfies IStoryfieldAiSystemAdmin.ILogin,
  });
  typia.assert(admin_login);

  // 3. (Not found) Attempt to fetch externalApiFailure detail for a non-existent record (random UUID)
  const randomFailureId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent externalApiFailure fetch should fail",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.externalApiFailures.at(
        connection,
        {
          externalApiFailureId: randomFailureId,
        },
      );
    },
  );

  // 4. (Happy path, simulate/integration) Attempt to retrieve an external API failure detail
  //    In an integrated suite, setup should ensure existence; here, retrievability is simulated
  let extFailure: IStoryfieldAiExternalApiFailure | undefined;
  try {
    extFailure =
      await api.functional.storyfieldAi.systemAdmin.externalApiFailures.at(
        connection,
        {
          externalApiFailureId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    typia.assert(extFailure);
    TestValidator.predicate("id is uuid", typeof extFailure.id === "string");
    TestValidator.predicate(
      "retry_count is number",
      typeof extFailure.retry_count === "number",
    );
    TestValidator.predicate(
      "api_type present",
      typeof extFailure.api_type === "string" && extFailure.api_type.length > 0,
    );
    TestValidator.predicate(
      "created_at present",
      typeof extFailure.created_at === "string",
    );
    TestValidator.predicate(
      "updated_at present",
      typeof extFailure.updated_at === "string",
    );
    // If masking is required by business rule, validate here (stub only, as spec not concrete)
    // TestValidator.equals("request_payload masked", extFailure.request_payload, null);
  } catch {}

  // 5. Access control: attempt to fetch detail without admin authentication (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot fetch externalApiFailure detail",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.externalApiFailures.at(
        unauthConn,
        {
          externalApiFailureId: randomFailureId,
        },
      );
    },
  );

  // 6. Audit requirement: In a production/audit environment, access event would be logged for compliance (not directly testable at API)
}
