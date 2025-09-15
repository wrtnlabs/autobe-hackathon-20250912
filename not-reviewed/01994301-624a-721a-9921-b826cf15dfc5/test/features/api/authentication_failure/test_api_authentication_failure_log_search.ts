import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAtsRecruitmentAuthenticationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentAuthenticationFailure";
import type { IAtsRecruitmentHrRecruiter } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentHrRecruiter";
import type { IAtsRecruitmentSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAtsRecruitmentSystemAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAtsRecruitmentAuthenticationFailure } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAtsRecruitmentAuthenticationFailure";

/**
 * End-to-end scenario for system admin authentication failure log search:
 *
 * 1. Register and authenticate as a system admin
 * 2. Generate at least one authentication failure event by attempting HR recruiter
 *    login with invalid credentials
 * 3. As system admin, call authentication failure log search endpoint
 * 4. Filter using attempted_user_identifier, failure_reason, and attempted_at date
 * 5. Try search with purposely invalid values (expect empty result)
 * 6. Verify result data structure and type
 * 7. Confirm failure logs trace to actual failed event
 * 8. Check access control by attempting the search without admin token (should be
 *    prohibited)
 */
export async function test_api_authentication_failure_log_search(
  connection: api.IConnection,
) {
  // 1. Register a system admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IAtsRecruitmentSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        super_admin: true,
      } satisfies IAtsRecruitmentSystemAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Generate an HR recruiter failed login
  const failedHrEmail = typia.random<string & tags.Format<"email">>();
  const failedPassword = RandomGenerator.alphaNumeric(16);
  await TestValidator.error("generate HR recruiter login failure", async () => {
    await api.functional.auth.hrRecruiter.login(connection, {
      body: {
        email: failedHrEmail,
        password: failedPassword,
      } satisfies IAtsRecruitmentHrRecruiter.ILogin,
    });
  });

  // 3. As authenticated system admin, search authentication failure logs
  const filter: IAtsRecruitmentAuthenticationFailure.IRequest = {
    attempted_user_identifier: failedHrEmail,
    page: 1,
    page_size: 50,
  };
  const result: IPageIAtsRecruitmentAuthenticationFailure.ISummary =
    await api.functional.atsRecruitment.systemAdmin.authenticationFailures.index(
      connection,
      { body: filter },
    );
  typia.assert(result);
  TestValidator.predicate(
    "failure log contains record for the attempted email",
    result.data.some(
      (failure) => failure.attempted_user_identifier === failedHrEmail,
    ),
  );

  // 4. Additional filters and logical checks
  if (result.data.length > 0) {
    const sample = result.data[0];
    // Filter by failure_reason
    const reasonFilter: IAtsRecruitmentAuthenticationFailure.IRequest = {
      failure_reason: sample.failure_reason,
      page: 1,
      page_size: 20,
    };
    const byReason =
      await api.functional.atsRecruitment.systemAdmin.authenticationFailures.index(
        connection,
        { body: reasonFilter },
      );
    typia.assert(byReason);
    TestValidator.predicate(
      "results filtered by failure reason include only records with correct reason",
      byReason.data.every((it) => it.failure_reason === sample.failure_reason),
    );

    // Filter by attempted_at window
    const windowFilter: IAtsRecruitmentAuthenticationFailure.IRequest = {
      attempted_at_from: sample.attempted_at,
      attempted_at_to: sample.attempted_at,
      page: 1,
      page_size: 10,
    };
    const byWindow =
      await api.functional.atsRecruitment.systemAdmin.authenticationFailures.index(
        connection,
        { body: windowFilter },
      );
    typia.assert(byWindow);
    TestValidator.predicate(
      "results filtered by attempted_at window include the sample",
      byWindow.data.some((it) => it.id === sample.id),
    );
  }

  // 5. Filter with purposely invalid value - expect empty result
  const garbageFilter: IAtsRecruitmentAuthenticationFailure.IRequest = {
    attempted_user_identifier: "nonexistent@invalid.example.com",
    page: 1,
    page_size: 5,
  };
  const emptyResult =
    await api.functional.atsRecruitment.systemAdmin.authenticationFailures.index(
      connection,
      { body: garbageFilter },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "search with invalid attempted_user_identifier yields no results",
    emptyResult.data.length,
    0,
  );

  // 6. Attempt search without admin credentials (should be denied)
  // Use a fresh connection object with empty headers
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "access control: unauthenticated user cannot search failure logs",
    async () => {
      await api.functional.atsRecruitment.systemAdmin.authenticationFailures.index(
        unauthenticatedConn,
        { body: filter },
      );
    },
  );
}
