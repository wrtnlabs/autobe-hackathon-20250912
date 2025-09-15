import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIStoryfieldAiTokenRevocation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStoryfieldAiTokenRevocation";
import type { IStoryfieldAiSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiSystemAdmin";
import type { IStoryfieldAiTokenRevocation } from "@ORGANIZATION/PROJECT-api/lib/structures/IStoryfieldAiTokenRevocation";

/**
 * Validate that system administrators can search, filter, and paginate
 * authentication token revocation events via PATCH
 * /storyfieldAi/systemAdmin/tokenRevocations, supporting audit and compliance
 * review.
 *
 * 1. Register and login a system admin
 * 2. Query revocation logs as admin with different filters and paginations
 * 3. Validate fields, pagination and filtering, edge cases (empty, bad filters)
 * 4. Attempt unauthorized log access as non-admin
 */
export async function test_api_token_revocation_log_admin_search_and_audit(
  connection: api.IConnection,
) {
  // 1. Register and login as admin
  const adminExternalId = RandomGenerator.alphaNumeric(12);
  const adminEmail = `${RandomGenerator.alphaNumeric(6)}@company.com`;
  const joinRes = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      external_admin_id: adminExternalId,
      email: adminEmail,
      actor_type: "systemAdmin",
    } satisfies IStoryfieldAiSystemAdmin.IJoin,
  });
  typia.assert(joinRes);
  const loginRes = await api.functional.auth.systemAdmin.login(connection, {
    body: {
      external_admin_id: adminExternalId,
      email: adminEmail,
    } satisfies IStoryfieldAiSystemAdmin.ILogin,
  });
  typia.assert(loginRes);
  // 2. Attempt log search as admin with no filter
  const pageBasic =
    await api.functional.storyfieldAi.systemAdmin.tokenRevocations.index(
      connection,
      { body: {} satisfies IStoryfieldAiTokenRevocation.IRequest },
    );
  typia.assert(pageBasic);
  // Validate pagination structure and audit log fields
  TestValidator.predicate(
    "admin receives pagination and audit fields",
    () =>
      !!pageBasic.pagination &&
      Array.isArray(pageBasic.data) &&
      pageBasic.data.every(
        (v) => v.id && v.token_hash && v.revoked_reason && v.created_at,
      ),
  );
  // 3. Test paging by page/limit
  const pageTwo =
    await api.functional.storyfieldAi.systemAdmin.tokenRevocations.index(
      connection,
      {
        body: {
          page: 2,
          limit: 1,
        } satisfies IStoryfieldAiTokenRevocation.IRequest,
      },
    );
  typia.assert(pageTwo);
  TestValidator.equals("page and limit", pageTwo.pagination.current, 2);
  TestValidator.equals("page and limit", pageTwo.pagination.limit, 1);
  // 4. Test search by non-existent reason / filter (empty result)
  const pageEmpty =
    await api.functional.storyfieldAi.systemAdmin.tokenRevocations.index(
      connection,
      {
        body: {
          revoked_reason: "doesnotmatchany",
        } satisfies IStoryfieldAiTokenRevocation.IRequest,
      },
    );
  typia.assert(pageEmpty);
  TestValidator.equals("empty filter result", pageEmpty.data.length, 0);
  // 5. Edge: Out-of-bounds page/limit
  const pageOob =
    await api.functional.storyfieldAi.systemAdmin.tokenRevocations.index(
      connection,
      {
        body: {
          page: 9999,
          limit: 5,
        } satisfies IStoryfieldAiTokenRevocation.IRequest,
      },
    );
  typia.assert(pageOob);
  // Allowed: page empty, OK
  // 6. If there is any record, test filtering by admin/user/date
  if (pageBasic.data.length) {
    const first = pageBasic.data[0];
    if (first.system_admin_id) {
      const pageByAdmin =
        await api.functional.storyfieldAi.systemAdmin.tokenRevocations.index(
          connection,
          {
            body: {
              system_admin_id: first.system_admin_id,
            } satisfies IStoryfieldAiTokenRevocation.IRequest,
          },
        );
      typia.assert(pageByAdmin);
      TestValidator.predicate(
        "filtered by system_admin_id",
        pageByAdmin.data.every(
          (v) => v.system_admin_id === first.system_admin_id,
        ),
      );
    }
    if (first.authenticated_user_id) {
      const pageByUser =
        await api.functional.storyfieldAi.systemAdmin.tokenRevocations.index(
          connection,
          {
            body: {
              authenticated_user_id: first.authenticated_user_id,
            } satisfies IStoryfieldAiTokenRevocation.IRequest,
          },
        );
      typia.assert(pageByUser);
      TestValidator.predicate(
        "filtered by user id",
        pageByUser.data.every(
          (v) => v.authenticated_user_id === first.authenticated_user_id,
        ),
      );
    }
    // Filter by created_at window
    const createdFrom = first.created_at;
    const pageByDate =
      await api.functional.storyfieldAi.systemAdmin.tokenRevocations.index(
        connection,
        {
          body: {
            created_from: createdFrom,
          } satisfies IStoryfieldAiTokenRevocation.IRequest,
        },
      );
    typia.assert(pageByDate);
    TestValidator.predicate(
      "filtered by from date",
      pageByDate.data.every(
        (v) =>
          new Date(v.created_at).getTime() >= new Date(createdFrom).getTime(),
      ),
    );
    // Filter by token_hash
    const pageByToken =
      await api.functional.storyfieldAi.systemAdmin.tokenRevocations.index(
        connection,
        {
          body: {
            token_hash: first.token_hash,
          } satisfies IStoryfieldAiTokenRevocation.IRequest,
        },
      );
    typia.assert(pageByToken);
    TestValidator.predicate(
      "filtered by token_hash",
      pageByToken.data.every((v) => v.token_hash === first.token_hash),
    );
  }
  // 7. Attempt unauthorized call as non-admin
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("non-admin forbidden from log", async () => {
    await api.functional.storyfieldAi.systemAdmin.tokenRevocations.index(
      unauthConn,
      { body: {} satisfies IStoryfieldAiTokenRevocation.IRequest },
    );
  });
}
