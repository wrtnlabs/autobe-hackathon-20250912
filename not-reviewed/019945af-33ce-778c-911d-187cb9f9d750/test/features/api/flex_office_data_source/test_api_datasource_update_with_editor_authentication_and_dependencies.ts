import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IFlexOfficeDataSource } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeDataSource";
import type { IFlexOfficeEditor } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeEditor";

export async function test_api_datasource_update_with_editor_authentication_and_dependencies(
  connection: api.IConnection,
) {
  // 1. Editor user registration and authentication
  const editorCreate = {
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IFlexOfficeEditor.ICreate;

  const editorAuthorized: IFlexOfficeEditor.IAuthorized =
    await api.functional.auth.editor.join(connection, {
      body: editorCreate,
    });
  typia.assert(editorAuthorized);

  // 2. Data source creation under editor context
  const dataSourceCreate = {
    name: RandomGenerator.name(),
    type: RandomGenerator.pick([
      "mysql",
      "postgresql",
      "google_sheet",
      "excel",
    ] as const),
    connection_info: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 10,
      wordMax: 20,
    }),
    is_active: true,
    deleted_at: null,
  } satisfies IFlexOfficeDataSource.ICreate;

  const dataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.editor.dataSources.create(connection, {
      body: dataSourceCreate,
    });
  typia.assert(dataSource);

  // 3. Update the data source with new parameters
  const dataSourceUpdate = {
    name: RandomGenerator.name(),
    type: RandomGenerator.pick([
      "mysql",
      "postgresql",
      "google_sheet",
      "excel",
    ] as const),
    connection_info: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 15,
      wordMax: 25,
    }),
    is_active: false,
  } satisfies IFlexOfficeDataSource.IUpdate;

  const updatedDataSource: IFlexOfficeDataSource =
    await api.functional.flexOffice.editor.dataSources.update(connection, {
      dataSourceId: dataSource.id,
      body: dataSourceUpdate,
    });
  typia.assert(updatedDataSource);

  // Validate updated fields equality
  TestValidator.equals(
    "updated name equals input",
    updatedDataSource.name,
    dataSourceUpdate.name,
  );
  TestValidator.equals(
    "updated type equals input",
    updatedDataSource.type,
    dataSourceUpdate.type,
  );
  TestValidator.equals(
    "updated connection_info equals input",
    updatedDataSource.connection_info,
    dataSourceUpdate.connection_info,
  );
  TestValidator.equals(
    "updated is_active equals input",
    updatedDataSource.is_active,
    dataSourceUpdate.is_active,
  );

  // Validate unchanged fields remain equal from original
  TestValidator.equals(
    "id remains unchanged",
    updatedDataSource.id,
    dataSource.id,
  );
  TestValidator.equals(
    "created_at remains unchanged",
    updatedDataSource.created_at,
    dataSource.created_at,
  );

  // Validate deleted_at remains null or preserved correctly
  if (dataSource.deleted_at === null || dataSource.deleted_at === undefined) {
    TestValidator.equals(
      "deleted_at remains null or undefined",
      updatedDataSource.deleted_at,
      dataSource.deleted_at ?? null,
    );
  } else {
    TestValidator.equals(
      "deleted_at preserved",
      updatedDataSource.deleted_at,
      dataSource.deleted_at,
    );
  }
}
