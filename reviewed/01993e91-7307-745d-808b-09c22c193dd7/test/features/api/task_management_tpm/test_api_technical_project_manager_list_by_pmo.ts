import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITaskManagementTpm";
import type { ITaskManagementPmo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementPmo";
import type { ITaskManagementTpm } from "@ORGANIZATION/PROJECT-api/lib/structures/ITaskManagementTpm";

/**
 * This E2E test validates PMO user can retrieve a paginated filtered list of
 * TPM users.
 *
 * Steps:
 *
 * 1. PMO user registration and login.
 * 2. Create multiple TPM users to populate the database.
 * 3. Perform paginated search with filters on TPM listing endpoint.
 * 4. Validate response includes correct pagination metadata.
 * 5. Validate TPM data matches search criteria.
 * 6. Verify unauthorized users cannot access TPM listing.
 */
export async function test_api_technical_project_manager_list_by_pmo(
  connection: api.IConnection,
) {
  // 1. Register PMO user with random realistic data
  const pmoEmail: string = typia.random<string & tags.Format<"email">>();
  const pmoPassword = "Password123!"; // Sample secure password

  const pmoJoin = await api.functional.auth.pmo.join(connection, {
    body: {
      email: pmoEmail,
      password: pmoPassword,
      name: RandomGenerator.name(),
    } satisfies ITaskManagementPmo.IJoin,
  });
  typia.assert(pmoJoin);

  // 2. Login PMO user to ensure Authorization token set in connection
  const pmoLogin = await api.functional.auth.pmo.login(connection, {
    body: {
      email: pmoEmail,
      password: pmoPassword,
    } satisfies ITaskManagementPmo.ILogin,
  });
  typia.assert(pmoLogin);

  // 3. Create multiple TPM users to fill database for pagination/filtering
  const tpmCount = 25;
  const createdTpms: ITaskManagementTpm[] = [];

  for (let i = 0; i < tpmCount; ++i) {
    const tpmEmail = `tpm${i}@example.com`;
    const tpmPassword = `TpmPass${1000 + i}`;
    const tpmName = RandomGenerator.name();

    const tpmCreated =
      await api.functional.taskManagement.pmo.taskManagement.tpms.create(
        connection,
        {
          body: {
            email: tpmEmail,
            password_hash: tpmPassword,
            name: tpmName,
          } satisfies ITaskManagementTpm.ICreate,
        },
      );
    typia.assert(tpmCreated);
    createdTpms.push(tpmCreated);
  }

  // 4. Prepare a paginated search with filtering
  // Use page=2 and limit=10 for pagination testing
  // Use a search term to match part of at least some TPM names or emails
  // We pick search term from an existing TPM's name or email substring

  const searchSample = RandomGenerator.pick(createdTpms);
  // Extract search substring from name (take first 3 letters if possible)
  const possibleSearchTerms: string[] = [];
  if (searchSample.name.length >= 3) {
    possibleSearchTerms.push(searchSample.name.slice(0, 3));
  }
  if (searchSample.email.length >= 5) {
    possibleSearchTerms.push(searchSample.email.slice(0, 5));
  }
  const searchTerm = RandomGenerator.pick(possibleSearchTerms);

  // 5. Call the TPM index ( PATCH method with body containing search and paging )
  const pageRequest = {
    page: 2,
    limit: 10,
    search: searchTerm,
  } satisfies ITaskManagementTpm.IRequest;

  const tpmPage =
    await api.functional.taskManagement.pmo.taskManagement.tpms.index(
      connection,
      {
        body: pageRequest,
      },
    );
  typia.assert(tpmPage);

  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page equals request page",
    tpmPage.pagination.current === 2,
  );
  TestValidator.predicate(
    "pagination limit equals request limit",
    tpmPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    tpmPage.pagination.pages > 0,
  );
  TestValidator.predicate(
    "pagination records is positive",
    tpmPage.pagination.records >= 0,
  );

  // 7. Validate returned TPM users match search term in email or name
  for (const tpm of tpmPage.data) {
    typia.assert(tpm);
    TestValidator.predicate(
      `tpm email or name contains search term '${searchTerm}'`,
      tpm.email.includes(searchTerm) || tpm.name.includes(searchTerm),
    );
    // Confirm ids exist in created TPMs
    const found = createdTpms.find((x) => x.id === tpm.id);
    TestValidator.predicate(
      `tpm id ${tpm.id} exists in created TPMs`,
      found !== undefined,
    );
  }

  // 8. Attempt unauthorized access with a fresh connection (no auth token)
  // Create a fresh connection without Authorization header
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized TPM listing should be rejected",
    async () => {
      await api.functional.taskManagement.pmo.taskManagement.tpms.index(
        unauthConn,
        {
          body: {
            page: 1,
            limit: 10,
            search: null,
          } satisfies ITaskManagementTpm.IRequest,
        },
      );
    },
  );
}
