import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformReceptionist";
import type { IHealthcarePlatformSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHealthcarePlatformSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHealthcarePlatformReceptionist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHealthcarePlatformReceptionist";

/**
 * Validate receptionist search functionality for system administrator scope.
 *
 * Ensures a system admin can search receptionists by various filters, receives
 * paginated results within their scope, and receives appropriate errors when
 * not authenticated. Scenarios include page navigation, filter application,
 * empty results, and unauthorized attempts.
 */
export async function test_api_receptionist_search_system_admin_scope(
  connection: api.IConnection,
) {
  // Step 1: Register and login as system admin
  const sysAdminEmail = typia.random<string & tags.Format<"email">>();
  const sysAdminJoin = await api.functional.auth.systemAdmin.join(connection, {
    body: {
      email: sysAdminEmail,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      provider: "local",
      provider_key: sysAdminEmail,
      password: "securePassword123",
    } satisfies IHealthcarePlatformSystemAdmin.IJoin,
  });
  typia.assert(sysAdminJoin);
  TestValidator.equals(
    "system admin email in join",
    sysAdminJoin.email,
    sysAdminEmail,
  );

  // Explicit login (could be skipped if join auto-logs-in, but ensures flow)
  const sysAdminLogin = await api.functional.auth.systemAdmin.login(
    connection,
    {
      body: {
        email: sysAdminEmail,
        provider: "local",
        provider_key: sysAdminEmail,
        password: "securePassword123",
      } satisfies IHealthcarePlatformSystemAdmin.ILogin,
    },
  );
  typia.assert(sysAdminLogin);
  TestValidator.equals(
    "system admin email in login",
    sysAdminLogin.email,
    sysAdminEmail,
  );

  // Step 2: Perform receptionist paginated search with no filter (default page)
  const resp1 =
    await api.functional.healthcarePlatform.systemAdmin.receptionists.index(
      connection,
      {
        body: {} satisfies IHealthcarePlatformReceptionist.IRequest,
      },
    );
  typia.assert(resp1);
  TestValidator.predicate(
    "pagination object present",
    typeof resp1.pagination === "object",
  );
  TestValidator.predicate("data array present", Array.isArray(resp1.data));

  // Step 3: Paginated search on second page and with limit
  const resp2 =
    await api.functional.healthcarePlatform.systemAdmin.receptionists.index(
      connection,
      {
        body: {
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 3 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IHealthcarePlatformReceptionist.IRequest,
      },
    );
  typia.assert(resp2);
  TestValidator.equals("pagination page = 2", resp2.pagination.current, 2);
  TestValidator.equals("pagination limit = 3", resp2.pagination.limit, 3);

  // Step 4: Search with a full_name substring filter (if receptionist exists)
  const dataSample = resp1.data[0];
  let filteredResp: IPageIHealthcarePlatformReceptionist.ISummary | undefined =
    undefined;
  if (dataSample) {
    filteredResp =
      await api.functional.healthcarePlatform.systemAdmin.receptionists.index(
        connection,
        {
          body: {
            full_name: RandomGenerator.substring(dataSample.full_name),
          } satisfies IHealthcarePlatformReceptionist.IRequest,
        },
      );
    typia.assert(filteredResp);
    TestValidator.predicate(
      "all returned full_names include substring",
      filteredResp.data.every((r) =>
        r.full_name.includes(filteredResp!.data[0].full_name.substring(0, 2)),
      ) || filteredResp.data.length === 0,
    );
  }

  // Step 5: Search with non-existent name (should yield empty result)
  const emptySearch =
    await api.functional.healthcarePlatform.systemAdmin.receptionists.index(
      connection,
      {
        body: {
          full_name: "zzzzzzzzzzzzzzzzzzzz",
        } satisfies IHealthcarePlatformReceptionist.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals("empty receptionist result", emptySearch.data.length, 0);

  // Step 6: Unauthorized receptionist search (should error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized receptionist search must fail",
    async () => {
      await api.functional.healthcarePlatform.systemAdmin.receptionists.index(
        unauthConn,
        {
          body: {} satisfies IHealthcarePlatformReceptionist.IRequest,
        },
      );
    },
  );
}
