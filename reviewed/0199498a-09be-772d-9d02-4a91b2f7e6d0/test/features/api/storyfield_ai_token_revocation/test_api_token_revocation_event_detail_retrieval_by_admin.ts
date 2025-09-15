import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";
import type { IStoryfieldAiTokenRevocation } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiTokenRevocation";

/**
 * Validate that a system admin can retrieve full detail for a specific token
 * revocation event, and that unauthorized access is blocked.
 *
 * 1. Register and authenticate a system admin, then create (or look up) a token
 *    revocation event id.
 * 2. Fetch token revocation details as admin and verify data shape, presence, and
 *    authorization.
 * 3. Attempt to fetch with unauthenticated connection and confirm forbidden/error
 *    result.
 * 4. Attempt to fetch with a random/non-existent UUID, confirm error/404 is
 *    thrown.
 */
export async function test_api_token_revocation_event_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a system admin
  const adminJoinReq = {
    external_admin_id: RandomGenerator.alphaNumeric(12),
    email: `${RandomGenerator.alphabets(8)}@company.com`,
    actor_type: "systemAdmin",
  } satisfies IStoryfieldAiSystemAdmin.IJoin;
  const adminAuth: IStoryfieldAiSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: adminJoinReq,
    });
  typia.assert(adminAuth);

  // Step 2: Fetch or construct a tokenRevocationId (simulate test mode)
  // Here, use typia.random to generate a valid UUID, knowing some backends support direct test population.
  const tokenRevocationId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Fetch token revocation details as system admin
  const detail: IStoryfieldAiTokenRevocation =
    await api.functional.storyfieldAi.systemAdmin.tokenRevocations.at(
      connection,
      { tokenRevocationId },
    );
  typia.assert(detail);

  TestValidator.equals(
    "id must match request tokenRevocationId",
    detail.id,
    tokenRevocationId,
  );
  TestValidator.predicate("token_hash present", detail.token_hash.length > 0);
  TestValidator.predicate(
    "revoked_reason present",
    detail.revoked_reason.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601 UTC string",
    /T.*Z$/.test(detail.created_at),
  );

  // Step 4: Attempt fetching details as unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized connection cannot access admin token revocation detail",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.tokenRevocations.at(
        unauthConn,
        { tokenRevocationId },
      );
    },
  );

  // Step 5: Attempt with a non-existent token revocation ID, expect error
  const badTokenRevocationId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent tokenRevocationId returns error/404",
    async () => {
      await api.functional.storyfieldAi.systemAdmin.tokenRevocations.at(
        connection,
        { tokenRevocationId: badTokenRevocationId },
      );
    },
  );
}
