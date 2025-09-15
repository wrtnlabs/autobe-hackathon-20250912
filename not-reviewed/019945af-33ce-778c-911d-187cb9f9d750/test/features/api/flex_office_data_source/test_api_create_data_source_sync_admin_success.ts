import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeAdmin";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeDataSourceSync } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSourceSync";

export async function test_api_create_data_source_sync_admin_success(
  connection: api.IConnection,
) {
  // 1. Admin join and authenticate
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const admin: IFlexOfficeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: { email, password } satisfies IFlexOfficeAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a data source
  const dataSourceCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    type: "mysql",
    connection_info: JSON.stringify({
      host: "localhost",
      port: 3306,
      user: "root",
      password: "root",
    }),
    is_active: true,
  } satisfies IFlexOfficeDataSource.ICreate;

  const dataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.admin.dataSources.create(connection, {
      body: dataSourceCreateBody,
    });
  typia.assert(dataSource);
  TestValidator.equals(
    "data source name matches",
    dataSource.name,
    dataSourceCreateBody.name,
  );
  TestValidator.equals(
    "data source type matches",
    dataSource.type,
    dataSourceCreateBody.type,
  );
  TestValidator.equals(
    "data source is_active matches",
    dataSource.is_active,
    dataSourceCreateBody.is_active,
  );

  // 3. Create a sync task for the created data source
  const now = new Date();
  const scheduledAt = new Date(now.getTime() + 3600 * 1000).toISOString(); // +1 hour
  const syncCreateBody = {
    flex_office_data_source_id: dataSource.id,
    scheduled_at: scheduledAt,
    status: "pending",
  } satisfies IFlexOfficeDataSourceSync.ICreate;

  const sync: IFlexOfficeDataSourceSync =
    await api.functional.flexOffice.admin.dataSources.syncs.createSync(
      connection,
      { dataSourceId: dataSource.id, body: syncCreateBody },
    );
  typia.assert(sync);

  TestValidator.equals(
    "sync flex_office_data_source_id matches",
    sync.flex_office_data_source_id,
    dataSource.id,
  );
  TestValidator.equals("sync status is pending", sync.status, "pending");
}
